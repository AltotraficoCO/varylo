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
    const pathnameIsMissingLocale = locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    // If locale is missing, redirect
    if (pathnameIsMissingLocale) {
        const locale = getLocale(req);
        // Correctly handle redirect while preserving query params could be done here, 
        // but simple redirect is fine for now.
        return NextResponse.redirect(
            new URL(`/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, nextUrl)
        );
    }

    // 2. Extract locale for further logic if needed (e.g. /es/dashboard)
    // const locale = pathname.split('/')[1];

    // 3. Protect Roles (adapted for locale prefix)
    // Logic: Check if path segment after locale matches protected routes
    // /es/super-admin -> segments: ['', 'es', 'super-admin']
    const segments = pathname.split('/');
    const pathWithoutLocale = '/' + segments.slice(2).join('/'); // /super-admin

    if (pathWithoutLocale.startsWith('/super-admin')) {
        if (userRole !== 'SUPER_ADMIN') {
            // Redirect to login preserving locale
            const locale = segments[1];
            return NextResponse.redirect(new URL(`/${locale}/login`, nextUrl));
        }
    }

    if (pathWithoutLocale.startsWith('/company')) {
        if (userRole !== 'COMPANY_ADMIN') {
            const locale = segments[1];
            return NextResponse.redirect(new URL(`/${locale}/login`, nextUrl));
        }
    }

    if (pathWithoutLocale.startsWith('/agent')) {
        if (userRole !== 'AGENT') {
            const locale = segments[1];
            return NextResponse.redirect(new URL(`/${locale}/login`, nextUrl));
        }
    }

    // prevent logged in users from accessing auth pages
    if (pathWithoutLocale === '/login' || pathWithoutLocale === '/register') {
        if (req.auth) {
            const locale = segments[1];
            return NextResponse.redirect(new URL(`/${locale}/dashboard`, nextUrl));
        }
    }

    return NextResponse.next();
});

export const config = {
    // Matcher ignoring static files and api
    matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|favicon\\.png|logo\\.png|icons/|sw\\.js|manifest\\.webmanifest|.*\\.svg).*)'],
};
