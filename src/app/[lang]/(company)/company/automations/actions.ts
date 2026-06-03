'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';

async function requireCompanyId(): Promise<string> {
    const session = await auth();
    if (!session?.user?.companyId) throw new Error('Unauthorized');
    return session.user.companyId;
}

/** Create a flow with an empty graph (just the trigger node). Returns its id. */
export async function createAutomationFlow(name: string): Promise<string> {
    const companyId = await requireCompanyId();
    const startId = `trigger_${randomBytes(4).toString('hex')}`;
    const graphJson = {
        startNodeId: startId,
        nodes: {
            [startId]: { id: startId, type: 'trigger', position: { x: 0, y: 0 }, label: 'Webhook' },
        },
    };
    const flow = await prisma.automationFlow.create({
        data: {
            companyId,
            name: name?.trim() || 'Nuevo agente condicional',
            webhookSecret: `whk_${randomBytes(24).toString('hex')}`,
            graphJson: graphJson as Prisma.InputJsonValue,
        },
    });
    revalidatePath('/[lang]/company/automations', 'page');
    return flow.id;
}

export async function saveAutomationGraph(id: string, graphJson: unknown): Promise<{ success: boolean }> {
    const companyId = await requireCompanyId();
    await prisma.automationFlow.update({
        where: { id, companyId },
        data: { graphJson: graphJson as Prisma.InputJsonValue },
    });
    return { success: true };
}

export async function renameAutomationFlow(id: string, name: string): Promise<void> {
    const companyId = await requireCompanyId();
    await prisma.automationFlow.update({
        where: { id, companyId },
        data: { name: name.trim() || 'Sin nombre' },
    });
    revalidatePath('/[lang]/company/automations', 'page');
}

export async function setAutomationStatus(id: string, status: 'DRAFT' | 'PUBLISHED'): Promise<void> {
    const companyId = await requireCompanyId();
    await prisma.automationFlow.update({
        where: { id, companyId },
        data: { status },
    });
    revalidatePath('/[lang]/company/automations', 'page');
}

export async function regenerateWebhookSecret(id: string): Promise<string> {
    const companyId = await requireCompanyId();
    const secret = `whk_${randomBytes(24).toString('hex')}`;
    await prisma.automationFlow.update({
        where: { id, companyId },
        data: { webhookSecret: secret },
    });
    return secret;
}

export async function deleteAutomationFlow(id: string): Promise<void> {
    const companyId = await requireCompanyId();
    await prisma.automationFlow.delete({ where: { id, companyId } });
    revalidatePath('/[lang]/company/automations', 'page');
}
