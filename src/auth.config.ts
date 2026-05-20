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
            if (trigger === 'update' && session) {
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
            const segments = nextUrl.pathname.split('/');
            const pathWithoutLocale = '/' + segments.slice(2).join('/');

            const isProtected =
                pathWithoutLocale.startsWith('/super-admin') ||
                pathWithoutLocale.startsWith('/company') ||
                pathWithoutLocale.startsWith('/agent') ||
                pathWithoutLocale.startsWith('/dashboard');

            if (!isProtected) {
                return true;
            }

            // Authenticated users pass through. Role-specific redirects are
            // handled at the page level so that the middleware doesn't bounce
            // between protected routes (which previously caused ERR_TOO_MANY_REDIRECTS).
            return !!auth?.user;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
