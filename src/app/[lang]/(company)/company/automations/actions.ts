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

export interface TestFlowResult {
    status: 'SUCCESS' | 'NO_MATCH' | 'ERROR';
    path: string[];
    error?: string;
    dispatch?: { agentName: string; template?: string };
}

/** Run a flow in dry-run mode against a test payload — never sends anything. */
export async function testAutomationFlow(id: string, payloadJson: string): Promise<TestFlowResult> {
    const companyId = await requireCompanyId();
    const flow = await prisma.automationFlow.findFirst({ where: { id, companyId } });
    if (!flow) return { status: 'ERROR', path: [], error: 'Flujo no encontrado.' };

    let payload: Record<string, unknown>;
    try {
        const parsed = JSON.parse(payloadJson || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { status: 'ERROR', path: [], error: 'El payload debe ser un objeto JSON.' };
        }
        payload = parsed;
    } catch {
        return { status: 'ERROR', path: [], error: 'JSON inválido.' };
    }

    const { runAutomationFlow } = await import('@/jobs/automation-runner');
    const result = await runAutomationFlow(flow, payload, undefined, { dryRun: true });

    let dispatch: TestFlowResult['dispatch'];
    if (result.dispatchPreview?.agentId) {
        const agent = await prisma.aiAgent.findFirst({ where: { id: result.dispatchPreview.agentId, companyId }, select: { name: true } });
        dispatch = { agentName: agent?.name || 'Agente', template: result.dispatchPreview.template?.name };
    }

    return { status: result.status, path: result.path, error: result.error, dispatch };
}
