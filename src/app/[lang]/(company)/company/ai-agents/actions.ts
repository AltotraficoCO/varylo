'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createAiAgent(prevState: string | undefined, formData: FormData) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return 'Error: No authorized session found.';
    }

    const name = formData.get('name') as string;
    const systemPrompt = formData.get('systemPrompt') as string;
    const contextInfo = formData.get('contextInfo') as string;
    const allowedModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    const model = allowedModels.includes(formData.get('model') as string)
        ? (formData.get('model') as string)
        : 'gpt-4o-mini';
    const rawTemp = parseFloat(formData.get('temperature') as string);
    const temperature = isNaN(rawTemp) ? 0.7 : Math.min(2.0, Math.max(0, rawTemp));
    const transferKeywordsRaw = formData.get('transferKeywords') as string;
    const channelIds = formData.getAll('channelIds') as string[];
    const calendarEnabled = formData.get('calendarEnabled') === 'on';
    const calendarId = (formData.get('calendarId') as string)?.trim() || 'primary';
    const ecommerceEnabled = formData.get('ecommerceEnabled') === 'on';

    if (!name || !systemPrompt) {
        return 'Error: Nombre y prompt del sistema son requeridos.';
    }

    const transferKeywords = transferKeywordsRaw
        ? transferKeywordsRaw.split(',').map(k => k.trim()).filter(Boolean).slice(0, 50)
        : ['humano', 'agente', 'persona'];

    try {
        // Verify channel IDs belong to this company
        let validChannelIds = channelIds;
        if (channelIds.length > 0) {
            const validChannels = await prisma.channel.findMany({
                where: { id: { in: channelIds }, companyId: session.user.companyId },
                select: { id: true },
            });
            validChannelIds = validChannels.map(c => c.id);
        }

        await prisma.aiAgent.create({
            data: {
                companyId: session.user.companyId,
                name,
                systemPrompt,
                contextInfo: contextInfo || null,
                model,
                temperature,
                transferKeywords,
                calendarEnabled,
                calendarId,
                ecommerceEnabled,
                channels: validChannelIds.length > 0 ? {
                    connect: validChannelIds.map(id => ({ id })),
                } : undefined,
            },
        });

        revalidatePath('/[lang]/company/ai-agents', 'page');
        return 'Success: Agente IA creado correctamente.';
    } catch (error) {
        console.error('Failed to create AI agent:', error);
        return 'Error: No se pudo crear el agente IA.';
    }
}

export async function updateAiAgent(prevState: string | undefined, formData: FormData) {
    const session = await auth();
    if (!session?.user?.companyId) return 'Error: No authorized session found.';

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const systemPrompt = formData.get('systemPrompt') as string;
    const contextInfo = formData.get('contextInfo') as string;
    const allowedModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    const model = allowedModels.includes(formData.get('model') as string)
        ? (formData.get('model') as string)
        : 'gpt-4o-mini';
    const rawTemp = parseFloat(formData.get('temperature') as string);
    const temperature = isNaN(rawTemp) ? 0.7 : Math.min(2.0, Math.max(0, rawTemp));
    const transferKeywordsRaw = formData.get('transferKeywords') as string;
    const channelIds = formData.getAll('channelIds') as string[];
    const calendarEnabled = formData.get('calendarEnabled') === 'on';
    const calendarId = (formData.get('calendarId') as string)?.trim() || 'primary';
    const ecommerceEnabled = formData.get('ecommerceEnabled') === 'on';

    if (!id || !name || !systemPrompt) return 'Error: Campos requeridos faltantes.';

    const transferKeywords = transferKeywordsRaw
        ? transferKeywordsRaw.split(',').map(k => k.trim()).filter(Boolean).slice(0, 50)
        : ['humano', 'agente', 'persona'];

    try {
        // Verify channel IDs belong to this company
        const validChannels = await prisma.channel.findMany({
            where: { id: { in: channelIds }, companyId: session.user.companyId },
            select: { id: true },
        });

        await prisma.aiAgent.update({
            where: { id, companyId: session.user.companyId },
            data: {
                name,
                systemPrompt,
                contextInfo: contextInfo || null,
                model,
                temperature,
                transferKeywords,
                calendarEnabled,
                calendarId,
                ecommerceEnabled,
                channels: {
                    set: validChannels.map(c => ({ id: c.id })),
                },
            },
        });

        revalidatePath('/[lang]/company/ai-agents', 'page');
        return 'Success: Agente IA actualizado correctamente.';
    } catch (error) {
        console.error('Failed to update AI agent:', error);
        return 'Error: No se pudo actualizar el agente IA.';
    }
}

export async function toggleAiAgent(id: string, isActive: boolean) {
    const session = await auth();
    if (!session?.user?.companyId) throw new Error('Unauthorized');

    await prisma.aiAgent.update({
        where: { id, companyId: session.user.companyId },
        data: { active: isActive },
    });

    revalidatePath('/[lang]/company/ai-agents', 'page');
}

export async function deleteAiAgent(id: string) {
    const session = await auth();
    if (!session?.user?.companyId) return 'Error: No authorized session found.';

    try {
        await prisma.aiAgent.delete({
            where: { id, companyId: session.user.companyId },
        });

        revalidatePath('/[lang]/company/ai-agents', 'page');
        return 'Success: Agente IA eliminado.';
    } catch (error) {
        console.error('Failed to delete AI agent:', error);
        return 'Error: No se pudo eliminar el agente IA.';
    }
}
