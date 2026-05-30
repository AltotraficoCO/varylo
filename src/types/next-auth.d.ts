import { Role } from '@prisma/client';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: Role;
            companyId: string | null;
            /** When a SUPER_ADMIN is impersonating a company, the id of that company. */
            actingCompanyId?: string | null;
            /** True while a SUPER_ADMIN is viewing the app as a company. */
            isImpersonating?: boolean;
        } & DefaultSession['user'];
        /** Top-level alias used by `unstable_update` to set/clear impersonation. */
        actingCompanyId?: string | null;
    }

    interface User {
        role: Role;
        companyId: string | null;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role: Role;
        companyId: string | null;
        id: string;
        /** Set by SUPER_ADMIN impersonation; overrides companyId for company-scoped views. */
        actingCompanyId?: string | null;
    }
}
