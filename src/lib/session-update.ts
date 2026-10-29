import type { JWT } from 'next-auth/jwt';

type UserClaims = Pick<JWT, 'id' | 'role' | 'companyId'>;
type Dependencies = {
    findUser: (id: string) => Promise<UserClaims | null>;
    companyExists: (id: string) => Promise<boolean>;
};

/** All update payloads, including unstable_update, must be treated as untrusted. */
export async function applySessionUpdate(
    token: JWT,
    update: unknown,
    { findUser, companyExists }: Dependencies,
): Promise<JWT | null> {
    // sub is the authenticated subject, never the id supplied in an update.
    if (!token.sub) return null;
    const user = await findUser(token.sub);
    if (!user) return null;

    const next = { ...token, id: user.id, role: user.role, companyId: user.companyId };
    if (user.role !== 'SUPER_ADMIN') {
        next.actingCompanyId = null;
        return next;
    }

    if (update && typeof update === 'object' && Object.hasOwn(update, 'actingCompanyId')) {
        const target = (update as { actingCompanyId: unknown }).actingCompanyId;
        if (target === null) {
            next.actingCompanyId = null;
        } else if (typeof target === 'string' && target.length > 0 && target.length <= 200
            && await companyExists(target)) {
            next.actingCompanyId = target;
        }
    }
    return next;
}
