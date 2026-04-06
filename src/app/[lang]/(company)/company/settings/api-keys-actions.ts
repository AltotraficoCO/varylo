'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes, createHash } from 'crypto';
import { revalidatePath } from 'next/cache';

const ALL_SCOPES = [
    'templates:read',
    'messages:read',
    'messages:write',
    'webhooks:write',
];

function generateApiKey(): string {
    const random = randomBytes(32).toString('hex');
    return `vk_live_${random}`;
}

function hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
}

export async function createApiKey(name: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, error: 'No autorizado.' };
    }

    if (!name || name.trim().length < 2 || name.length > 50) {
        return { success: false, error: 'El nombre debe tener entre 2 y 50 caracteres.' };
    }

    const companyId = session.user.companyId;

    // Limit API keys per company
    const count = await prisma.apiKey.count({ where: { companyId, active: true } });
    if (count >= 5) {
        return { success: false, error: 'Máximo 5 API keys activas por empresa.' };
    }

    const rawKey = generateApiKey();
    const hashed = hashKey(rawKey);
    const lastFour = rawKey.slice(-4);

    await prisma.apiKey.create({
        data: {
            companyId,
            name: name.trim(),
            key: rawKey,
            hashedKey: hashed,
            lastFour,
            scopes: ALL_SCOPES,
            rateLimit: 60,
        },
    });

    revalidatePath('/company/settings');

    // Return the raw key only once - it won't be retrievable later
    return {
        success: true,
        apiKey: rawKey,
        message: 'API key creada. Copia la clave ahora, no se mostrará de nuevo.',
    };
}

export async function listApiKeys() {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, keys: [] };
    }

    const keys = await prisma.apiKey.findMany({
        where: { companyId: session.user.companyId },
        select: {
            id: true,
            name: true,
            lastFour: true,
            scopes: true,
            active: true,
            lastUsedAt: true,
            createdAt: true,
            webhookUrl: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return {
        success: true,
        keys: keys.map((k) => ({
            ...k,
            lastUsedAt: k.lastUsedAt?.toISOString() || null,
            createdAt: k.createdAt.toISOString(),
        })),
    };
}

export async function revokeApiKey(keyId: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, error: 'No autorizado.' };
    }

    const key = await prisma.apiKey.findFirst({
        where: { id: keyId, companyId: session.user.companyId },
    });

    if (!key) {
        return { success: false, error: 'API key no encontrada.' };
    }

    await prisma.apiKey.update({
        where: { id: keyId },
        data: { active: false },
    });

    revalidatePath('/company/settings');
    return { success: true, message: 'API key revocada.' };
}

export async function deleteApiKey(keyId: string) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return { success: false, error: 'No autorizado.' };
    }

    const key = await prisma.apiKey.findFirst({
        where: { id: keyId, companyId: session.user.companyId },
    });

    if (!key) {
        return { success: false, error: 'API key no encontrada.' };
    }

    await prisma.apiKey.delete({ where: { id: keyId } });

    revalidatePath('/company/settings');
    return { success: true, message: 'API key eliminada.' };
}
