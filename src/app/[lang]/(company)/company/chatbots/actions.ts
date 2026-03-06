'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import type { ChatbotFlow } from '@/types/chatbot';

const DEFAULT_FLOW: ChatbotFlow = {
    startNodeId: 'welcome',
    nodes: {
        welcome: {
            id: 'welcome',
            message: '',
            options: [],
        },
    },
};

export async function createChatbot(prevState: string | undefined, formData: FormData) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return 'Error: No authorized session found.';
    }

    const name = formData.get('name') as string;
    const channelIds = formData.getAll('channelIds') as string[];

    if (!name) {
        return 'Error: El nombre es requerido.';
    }

    try {
        // If no channels selected, auto-connect to all active channels
        let connectIds = channelIds;
        if (connectIds.length === 0) {
            const activeChannels = await prisma.channel.findMany({
                where: { companyId: session.user.companyId, status: 'CONNECTED' },
                select: { id: true },
            });
            connectIds = activeChannels.map(c => c.id);
        } else {
            // Verify all provided channel IDs belong to this company
            const validChannels = await prisma.channel.findMany({
                where: { id: { in: connectIds }, companyId: session.user.companyId },
                select: { id: true },
            });
            connectIds = validChannels.map(c => c.id);
        }

        const chatbot = await prisma.chatbot.create({
            data: {
                companyId: session.user.companyId,
                name,
                flowJson: DEFAULT_FLOW as unknown as Prisma.InputJsonValue,
                channels: connectIds.length > 0 ? {
                    connect: connectIds.map(id => ({ id })),
                } : undefined,
            },
        });

        revalidatePath('/[lang]/company/chatbots', 'page');
        return `Success:${chatbot.id}`;
    } catch (error) {
        console.error('Failed to create chatbot:', error);
        return 'Error: No se pudo crear el chatbot.';
    }
}

export async function updateChatbot(prevState: string | undefined, formData: FormData) {
    const session = await auth();
    if (!session?.user?.companyId) return 'Error: No authorized session found.';

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const channelIds = formData.getAll('channelIds') as string[];

    if (!id || !name) return 'Error: Campos requeridos faltantes.';

    try {
        // Verify all channel IDs belong to this company
        const validChannels = await prisma.channel.findMany({
            where: { id: { in: channelIds }, companyId: session.user.companyId },
            select: { id: true },
        });

        await prisma.chatbot.update({
            where: { id, companyId: session.user.companyId },
            data: {
                name,
                channels: {
                    set: validChannels.map(c => ({ id: c.id })),
                },
            },
        });

        revalidatePath('/[lang]/company/chatbots', 'page');
        return 'Success: Chatbot actualizado.';
    } catch (error) {
        console.error('Failed to update chatbot:', error);
        return 'Error: No se pudo actualizar.';
    }
}

export async function toggleChatbot(id: string, isActive: boolean) {
    const session = await auth();
    if (!session?.user?.companyId) throw new Error('Unauthorized');

    await prisma.chatbot.update({
        where: { id, companyId: session.user.companyId },
        data: { active: isActive },
    });

    revalidatePath('/[lang]/company/chatbots', 'page');
}

export async function deleteChatbot(id: string) {
    const session = await auth();
    if (!session?.user?.companyId) return 'Error: No authorized session found.';

    try {
        await prisma.chatbot.delete({
            where: { id, companyId: session.user.companyId },
        });

        revalidatePath('/[lang]/company/chatbots', 'page');
        return 'Success: Chatbot eliminado.';
    } catch (error) {
        console.error('Failed to delete chatbot:', error);
        return 'Error: No se pudo eliminar.';
    }
}
