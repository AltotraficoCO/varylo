'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { Plan, Role } from '@prisma/client';
import { z } from 'zod';
import { sendWelcomeEmail } from '@/lib/email';

const registerSchema = z.object({
    companyName: z.string().min(1).max(200).trim(),
    name: z.string().min(1).max(100).trim(),
    email: z.string().email().max(254),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
    plan: z.nativeEnum(Plan),
});

export async function register(prevState: string | undefined, formData: FormData) {
    const parsed = registerSchema.safeParse({
        companyName: formData.get('companyName'),
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        plan: formData.get('plan'),
    });

    if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message;
        return firstError || 'Datos inválidos.';
    }

    const { companyName, name, email, password, plan } = parsed.data;

    // 1. Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return 'Email already in use.';
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        // 3. Create Company and User in transaction
        await prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
                data: {
                    name: companyName,
                    plan: plan,
                    status: 'ACTIVE',
                },
            });

            await tx.user.create({
                data: {
                    name,
                    email,
                    passwordHash,
                    role: Role.COMPANY_ADMIN,
                    companyId: company.id,
                },
            });
        });
    } catch (err) {
        console.error(err);
        return 'Failed to create account.';
    }

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name, companyName).catch(() => {});

    redirect('/login');
}
