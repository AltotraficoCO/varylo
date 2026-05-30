import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

async function verifyPassword(plain: string, hashed: string | null) {
    if (!hashed) return false;
    return await bcrypt.compare(plain, hashed);
}

export const { auth, signIn, signOut, handlers, unstable_update } = NextAuth({
    ...authConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: 'jwt' },
    callbacks: {
        ...authConfig.callbacks,
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(8).max(128) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await prisma.user.findUnique({
                        where: { email },
                        include: { company: { select: { status: true } } },
                    });
                    if (!user) return null;

                    const isValid = await verifyPassword(password, user.passwordHash);
                    if (!isValid) return null;

                    if (user.company?.status === 'SUSPENDED') {
                        throw new Error('COMPANY_SUSPENDED');
                    }

                    return user;
                }
                return null;
            },
        }),
    ],
});
