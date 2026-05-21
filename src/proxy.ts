import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const { auth } = NextAuth(authConfig);

const locales = ['en', 'es'];
const defaultLocale = 'es';

function getLocale(request: Request) {
    const headers = { 'accept-language': request.headers.get('accept-language') || '' };
    const languages = new Negotiator({ headers }).languages();
    return match(languages, locales, defaultLocale);
}

export default auth((req) => {
    const { nextUrl } = req;
    const userRole = req.auth?.user?.role as string | undefined;

    // 1. Check for Locale
    const pathname = nextUrl.pathname;

    // Public routes that bypass locale prefix
    const localeExempt = pathname === '/status' || pathname.startsWith('/status/');

    const pathnameIsMissingLocale = !localeExempt && locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    // If locale is missing, redirect (preserving search params and hash)
    if (pathnameIsMissingLocale) {
        const locale = getLocale(req);
        const target = new URL(`/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, nextUrl);
        target.search = nextUrl.search;
        target.hash = nextUrl.hash;
        return NextResponse.redirect(target);
    }

    // 2. Protect Roles (adapted for locale prefix)
    // Logic: Check if path segment after locale matches protected routes
    // /es/super-admin -> segments: ['', 'es', 'super-admin']
    const segments = pathname.split('/');
    const pathWithoutLocale = '/' + segments.slice(2).join('/'); // /super-admin

    const locale = segments[1];

    if (pathWithoutLocale.startsWith('/super-admin')) {
        if (userRole !== 'SUPER_ADMIN') {
            return NextResponse.redirect(new URL(`/${locale}/login`, nextUrl));
        }
    }

    if (pathWithoutLocale.startsWith('/company')) {
        // COMPANY_ADMIN, SUPERVISOR and SUPER_ADMIN may access the company area.
        if (userRole !== 'COMPANY_ADMIN' && userRole !== 'SUPERVISOR' && userRole !== 'SUPER_ADMIN') {
            return NextResponse.redirect(new URL(`/${locale}/login`, nextUrl));
        }
        // Supervisors are limited to conversations and the team page.
        if (userRole === 'SUPERVISOR') {
            const supervisorAllowed =
                pathWithoutLocale.startsWith('/company/conversations') ||
                pathWithoutLocale.startsWith('/company/agents');
            if (!supervisorAllowed) {
                return NextResponse.redirect(new URL(`/${locale}/company/conversations`, nextUrl));
            }
        }
    }

    if (pathWithoutLocale.startsWith('/agent')) {
        // Agents plus admins may access the agent inbox.
        if (userRole !== 'AGENT' && userRole !== 'COMPANY_ADMIN' && userRole !== 'SUPER_ADMIN') {
            return NextResponse.redirect(new URL(`/${locale}/login`, nextUrl));
        }
    }

    // prevent logged in users from accessing auth pages
    if (pathWithoutLocale === '/login' || pathWithoutLocale === '/register') {
        if (req.auth) {
            return NextResponse.redirect(new URL(`/${locale}/dashboard`, nextUrl));
        }
    }

    const response = NextResponse.next();

    // Security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    return response;
});

export const config = {
    // Matcher ignoring static files and api
    matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|favicon\\.png|logo\\.png|icons/|sw\\.js|manifest\\.webmanifest|.*\\.svg).*)'],
};
