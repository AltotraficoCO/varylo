'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

const ASSIGNABLE_ROLES = [Role.AGENT, Role.SUPERVISOR] as const;
type AssignableRole = typeof ASSIGNABLE_ROLES[number];

function parseRole(value: FormDataEntryValue | null): AssignableRole {
    if (value === Role.SUPERVISOR) return Role.SUPERVISOR;
    return Role.AGENT;
}

export async function createAgent(prevState: string | undefined, formData: FormData) {
    const session = await auth();

    if (!session?.user?.companyId) {
        return 'Error: No authorized session found.';
    }
    if (session.user.role !== Role.COMPANY_ADMIN) {
        return 'Error: Only company admins can create users.';
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = parseRole(formData.get('role'));

    if (!name || !email || !password) {
        return 'Error: All fields are required.';
    }

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return 'Error: User with this email already exists.';
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: hashedPassword,
                role,
                companyId: session.user.companyId,
            },
        });

        revalidatePath('/[lang]/company/agents', 'page');
        return 'Success: User created successfully.';
    } catch (error) {
        console.error('Failed to create user:', error);
        return 'Error: Failed to create user.';
    }
}

export async function updateAgent(prevState: string | undefined, formData: FormData) {
    const session = await auth();
    if (!session?.user?.companyId) return 'Error: No authorized session found.';
    if (session.user.role !== Role.COMPANY_ADMIN) {
        return 'Error: Only company admins can edit users.';
    }

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    if (!id || !name || !email) return 'Error: All fields are required.';

    try {
        await prisma.user.update({
            where: {
                id,
                companyId: session.user.companyId,
                role: { in: [...ASSIGNABLE_ROLES] },
            },
            data: { name, email },
        });

        revalidatePath('/[lang]/company/agents', 'page');
        return 'Success: User updated successfully.';
    } catch (error) {
        console.error('Failed to update user:', error);
        return 'Error: Failed to update user.';
    }
}

export async function setUserRole(id: string, role: AssignableRole) {
    const session = await auth();
    if (!session?.user?.companyId) {
        throw new Error('Unauthorized');
    }
    if (session.user.role !== Role.COMPANY_ADMIN) {
        throw new Error('Only company admins can change roles');
    }
    if (id === session.user.id) {
        throw new Error('Cannot change your own role');
    }
    if (!ASSIGNABLE_ROLES.includes(role)) {
        throw new Error('Invalid role');
    }

    await prisma.user.update({
        where: {
            id,
            companyId: session.user.companyId,
            role: { in: [...ASSIGNABLE_ROLES] },
        },
        data: { role },
    });

    revalidatePath('/[lang]/company/agents', 'page');
}

export async function toggleAgentStatus(id: string, isActive: boolean) {
    const session = await auth();
    if (!session?.user?.companyId) {
        throw new Error('Unauthorized');
    }
    if (session.user.role !== Role.COMPANY_ADMIN) {
        throw new Error('Only company admins can toggle user status');
    }

    try {
        await prisma.user.update({
            where: {
                id,
                companyId: session.user.companyId,
                role: { in: [...ASSIGNABLE_ROLES] },
            },
            data: { active: isActive },
        });
        revalidatePath('/[lang]/company/agents', 'page');
    } catch {
        throw new Error('Failed to update user status');
    }
}

export async function deleteAgent(id: string) {
    const session = await auth();
    if (!session?.user?.companyId) return 'Error: No authorized session found.';
    if (session.user.role !== Role.COMPANY_ADMIN) {
        return 'Error: Only company admins can delete users.';
    }

    try {
        await prisma.user.delete({
            where: {
                id,
                companyId: session.user.companyId,
                role: { in: [...ASSIGNABLE_ROLES] },
            },
        });

        revalidatePath('/[lang]/company/agents', 'page');
        return 'Success: User deleted successfully.';
    } catch {
        return 'Error: Failed to delete user.';
    }
}
