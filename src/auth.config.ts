import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = user.role;
                token.companyId = user.companyId;
                token.id = user.id;
            }
            // Support updating session on the client
            if (trigger === "update" && session) {
                token = { ...token, ...session };
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.role = token.role as any;
                session.user.companyId = token.companyId as string | null;
                session.user.id = token.id as string;
            }
            return session;
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const userRole = (auth?.user as any)?.role;

            const segments = nextUrl.pathname.split('/');
            const pathWithoutLocale = '/' + segments.slice(2).join('/');

            const isSuperAdminRoute = pathWithoutLocale.startsWith('/super-admin');
            const isCompanyRoute = pathWithoutLocale.startsWith('/company');
            const isAgentRoute = pathWithoutLocale.startsWith('/agent');
            const isDashboardRoute = pathWithoutLocale.startsWith('/dashboard');

            // All protected routes require authentication
            if (isSuperAdminRoute || isCompanyRoute || isAgentRoute || isDashboardRoute) {
                if (!isLoggedIn) return false;

                // Role-based access control
                if (isSuperAdminRoute && userRole !== 'SUPER_ADMIN') {
                    return Response.redirect(new URL(`/${segments[1]}/login`, nextUrl));
                }
                if (isCompanyRoute && userRole !== 'COMPANY_ADMIN' && userRole !== 'SUPERVISOR' && userRole !== 'SUPER_ADMIN') {
                    return Response.redirect(new URL(`/${segments[1]}/login`, nextUrl));
                }
                if (isAgentRoute && userRole !== 'AGENT' && userRole !== 'COMPANY_ADMIN' && userRole !== 'SUPER_ADMIN') {
                    return Response.redirect(new URL(`/${segments[1]}/login`, nextUrl));
                }

                return true;
            }

            // Allow access to other pages (marketing, auth)
            return true;
        },
    },
    providers: [], // Providers added in auth.ts
} satisfies NextAuthConfig;
