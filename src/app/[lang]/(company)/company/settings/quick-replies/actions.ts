'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function normalizeShortcut(raw: string): string {
    const trimmed = raw.trim().toLowerCase().replace(/\s+/g, '-');
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export async function listQuickReplies() {
    const session = await auth();
    if (!session?.user?.companyId) return [];

    return prisma.quickReply.findMany({
        where: { companyId: session.user.companyId },
        include: { createdBy: { select: { id: true, name: true, email: true } } },
        orderBy: { shortcut: 'asc' },
    });
}

export async function createQuickReply(data: { shortcut: string; content: string }) {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.companyId) {
        return { success: false, error: 'Unauthorized' };
    }

    const shortcut = normalizeShortcut(data.shortcut);
    const content = data.content.trim();

    if (shortcut.length < 2 || shortcut.length > 40) {
        return { success: false, error: 'El atajo debe tener entre 2 y 40 caracteres.' };
    }
    if (!/^\/[a-z0-9_-]+$/.test(shortcut)) {
        return { success: false, error: 'El atajo solo puede contener letras, números, guiones y guiones bajos.' };
    }
    if (!content) {
        return { success: false, error: 'El contenido no puede estar vacío.' };
    }
    if (content.length > 4000) {
        return { success: false, error: 'El contenido no puede superar 4000 caracteres.' };
    }

    try {
        await prisma.quickReply.create({
            data: {
                companyId: session.user.companyId,
                createdById: session.user.id,
                shortcut,
                content,
            },
        });
        revalidatePath('/[lang]/company/settings/quick-replies', 'page');
        revalidatePath('/[lang]/company/conversations', 'page');
        return { success: true };
    } catch (error: unknown) {
        const code = (error as { code?: string })?.code;
        if (code === 'P2002') {
            return { success: false, error: 'Ya existe una respuesta con ese atajo.' };
        }
        console.error('Failed to create quick reply:', error);
        return { success: false, error: 'No se pudo crear la respuesta.' };
    }
}

export async function updateQuickReply(id: string, data: { shortcut: string; content: string }) {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, error: 'Unauthorized' };

    const shortcut = normalizeShortcut(data.shortcut);
    const content = data.content.trim();

    if (!/^\/[a-z0-9_-]+$/.test(shortcut)) {
        return { success: false, error: 'Atajo inválido.' };
    }
    if (!content) {
        return { success: false, error: 'El contenido no puede estar vacío.' };
    }

    try {
        await prisma.quickReply.update({
            where: { id, companyId: session.user.companyId },
            data: { shortcut, content },
        });
        revalidatePath('/[lang]/company/settings/quick-replies', 'page');
        revalidatePath('/[lang]/company/conversations', 'page');
        return { success: true };
    } catch (error: unknown) {
        const code = (error as { code?: string })?.code;
        if (code === 'P2002') {
            return { success: false, error: 'Ya existe una respuesta con ese atajo.' };
        }
        console.error('Failed to update quick reply:', error);
        return { success: false, error: 'No se pudo actualizar la respuesta.' };
    }
}

export async function deleteQuickReply(id: string) {
    const session = await auth();
    if (!session?.user?.companyId) return { success: false, error: 'Unauthorized' };

    try {
        await prisma.quickReply.delete({
            where: { id, companyId: session.user.companyId },
        });
        revalidatePath('/[lang]/company/settings/quick-replies', 'page');
        revalidatePath('/[lang]/company/conversations', 'page');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete quick reply:', error);
        return { success: false, error: 'No se pudo eliminar la respuesta.' };
    }
}

export async function getQuickRepliesForChat() {
    const session = await auth();
    if (!session?.user?.companyId) return [];
    return prisma.quickReply.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true, shortcut: true, content: true },
        orderBy: { shortcut: 'asc' },
    });
}
