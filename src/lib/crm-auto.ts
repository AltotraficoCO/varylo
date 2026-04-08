import { prisma } from '@/lib/prisma';

/**
 * Auto-create a deal when a new conversation starts.
 * Finds the first pipeline stage ("Nuevo") and creates a deal linked to the contact.
 */
export async function autoCreateDeal(companyId: string, contactId: string, conversationId: string, firstMessage?: string) {
    try {
        // Find the first stage (lowest sortOrder)
        const firstStage = await prisma.pipelineStage.findFirst({
            where: { companyId },
            orderBy: { sortOrder: 'asc' },
        });

        if (!firstStage) return; // No pipeline configured

        // Check if there's already an open deal for this contact
        const existingDeal = await prisma.deal.findFirst({
            where: { companyId, contactId, status: 'OPEN' },
        });

        if (existingDeal) return; // Already has an open deal

        // Get contact info for deal title
        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
            select: { name: true, phone: true },
        });

        // Generate title from contact name, or first message preview
        let title: string;
        if (contact?.name) {
            title = `Oportunidad - ${contact.name}`;
        } else if (firstMessage && firstMessage.length > 5) {
            title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '...' : '');
        } else {
            title = `Oportunidad - ${contact?.phone || 'Nuevo contacto'}`;
        }

        await prisma.deal.create({
            data: {
                companyId,
                stageId: firstStage.id,
                contactId,
                conversationId,
                title,
                status: 'OPEN',
                probability: 20,
            },
        });

        console.log(`[CRM] Auto-created deal for contact ${contactId} in stage "${firstStage.name}"`);
    } catch (error) {
        // Don't break the main flow if CRM fails
        console.error('[CRM] Failed to auto-create deal:', error);
    }
}

/**
 * Move a deal to a specific stage by name.
 * Used by AI agents to advance deals in the pipeline.
 */
export async function moveDealByStage(companyId: string, contactId: string, stageName: string): Promise<{ success: boolean; message: string }> {
    try {
        const deal = await prisma.deal.findFirst({
            where: { companyId, contactId, status: 'OPEN' },
        });

        if (!deal) return { success: false, message: 'No hay deal abierto para este contacto' };

        const stage = await prisma.pipelineStage.findFirst({
            where: {
                companyId,
                name: { contains: stageName, mode: 'insensitive' },
            },
        });

        if (!stage) return { success: false, message: `Etapa "${stageName}" no encontrada` };

        await prisma.deal.update({
            where: { id: deal.id },
            data: { stageId: stage.id },
        });

        return { success: true, message: `Deal movido a "${stage.name}"` };
    } catch (error) {
        return { success: false, message: 'Error al mover el deal' };
    }
}

/**
 * Mark a deal as won or lost.
 */
export async function closeDeal(companyId: string, contactId: string, won: boolean, value?: number): Promise<{ success: boolean; message: string }> {
    try {
        const deal = await prisma.deal.findFirst({
            where: { companyId, contactId, status: 'OPEN' },
        });

        if (!deal) return { success: false, message: 'No hay deal abierto' };

        await prisma.deal.update({
            where: { id: deal.id },
            data: {
                status: won ? 'WON' : 'LOST',
                closedAt: new Date(),
                ...(value !== undefined ? { value } : {}),
            },
        });

        return { success: true, message: won ? 'Deal marcado como ganado' : 'Deal marcado como perdido' };
    } catch (error) {
        return { success: false, message: 'Error al cerrar el deal' };
    }
}
