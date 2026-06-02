'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AI_AGENT_TYPES } from '@/lib/ai-agent-types';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { validateExternalWebhookUrl } from '@/lib/url-validator';
import { sendWebhook, buildWebhookPayload } from '@/lib/webhook-sender';

type WebhookParseResult =
    | { ok: true; value: Prisma.InputJsonValue | null }
    | { ok: false; error: string };

async function parseWebhookConfig(formData: FormData): Promise<WebhookParseResult> {
    const webhookUrl = (formData.get('webhookUrl') as string)?.trim() || '';
    if (!webhookUrl) return { ok: true, value: null };

    const validated = await validateExternalWebhookUrl(webhookUrl);
    if (!validated.ok) return { ok: false, error: `Webhook URL: ${validated.error}` };

    const webhookSecret = (formData.get('webhookSecret') as string)?.trim() || '';
    const webhookHeadersRaw = (formData.get('webhookHeaders') as string)?.trim() || '';

    let headers: Record<string, string> | undefined;
    if (webhookHeadersRaw) {
        try {
            headers = JSON.parse(webhookHeadersRaw);
        } catch {
            // Invalid JSON — ignore headers
        }
    }

    return {
        ok: true,
        value: {
            url: validated.url.toString(),
            ...(webhookSecret ? { secret: webhookSecret } : {}),
            ...(headers ? { headers } : {}),
        },
    };
}

export async function createAiAgent(prevState: string | undefined, formData: FormData) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return 'Error: No authorized session found.';
    }

    const name = formData.get('name') as string;
    const agentType = formData.get('agentType') as string || 'CUSTOM';
    const systemPrompt = formData.get('systemPrompt') as string;
    const contextInfo = formData.get('contextInfo') as string;
    const allowedModels = [
        // current (2026)
        'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano',
        'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001',
        'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash',
        // previous (still selectable)
        'gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo',
        'claude-sonnet-4-5-20251030', 'claude-opus-4-6',
        // legacy aliases — kept so existing agents can still be edited without forced model change
        'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-7-sonnet-20250219', 'claude-opus-4-5',
        'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash',
    ];
    const model = allowedModels.includes(formData.get('model') as string)
        ? (formData.get('model') as string)
        : 'gpt-4o-mini';
    const rawTemp = parseFloat(formData.get('temperature') as string);
    const temperature = isNaN(rawTemp) ? 0.7 : Math.min(2.0, Math.max(0, rawTemp));
    const rawBuffer = parseInt(formData.get('bufferSeconds') as string, 10);
    const bufferSeconds = isNaN(rawBuffer) ? 0 : Math.min(30, Math.max(0, rawBuffer));
    const transferKeywordsRaw = formData.get('transferKeywords') as string;
    const channelIds = formData.getAll('channelIds') as string[];
    const dataCaptureEnabled = formData.get('dataCaptureEnabled') !== 'off';
    const captureFieldsRaw = formData.get('captureFields') as string;
    let captureFields: any = null;
    if (captureFieldsRaw) {
        try { captureFields = JSON.parse(captureFieldsRaw); } catch {}
    }
    const calendarEnabled = formData.get('calendarEnabled') === 'on';
    const calendarId = (formData.get('calendarId') as string)?.trim() || 'primary';
    const ecommerceEnabled = formData.get('ecommerceEnabled') === 'on';
    const crmEnabled = formData.get('crmEnabled') === 'on';

    if (!name || !systemPrompt) {
        return 'Error: Nombre y prompt del sistema son requeridos.';
    }

    const finalAgentType = (AI_AGENT_TYPES as readonly string[]).includes(agentType) ? agentType : 'CUSTOM';

    const transferKeywords = transferKeywordsRaw
        ? transferKeywordsRaw.split(',').map(k => k.trim()).filter(Boolean).slice(0, 50)
        : ['humano', 'agente', 'persona'];

    const webhookParsed = await parseWebhookConfig(formData);
    if (!webhookParsed.ok) return `Error: ${webhookParsed.error}`;
    const webhookConfigJson = webhookParsed.value;

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
                agentType: finalAgentType,
                systemPrompt,
                contextInfo: contextInfo || null,
                model,
                temperature,
                bufferSeconds,
                transferKeywords,
                dataCaptureEnabled,
                captureFields: captureFields ?? Prisma.JsonNull,
                calendarEnabled,
                calendarId,
                ecommerceEnabled,
                crmEnabled,
                webhookConfigJson: webhookConfigJson ?? Prisma.JsonNull,
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
    const agentType = formData.get('agentType') as string || 'CUSTOM';
    const systemPrompt = formData.get('systemPrompt') as string;
    const contextInfo = formData.get('contextInfo') as string;
    const allowedModels = [
        // current (2026)
        'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano',
        'claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001',
        'gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash',
        // previous (still selectable)
        'gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo',
        'claude-sonnet-4-5-20251030', 'claude-opus-4-6',
        // legacy aliases — kept so existing agents can still be edited without forced model change
        'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-7-sonnet-20250219', 'claude-opus-4-5',
        'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash',
    ];
    const model = allowedModels.includes(formData.get('model') as string)
        ? (formData.get('model') as string)
        : 'gpt-4o-mini';
    const rawTemp = parseFloat(formData.get('temperature') as string);
    const temperature = isNaN(rawTemp) ? 0.7 : Math.min(2.0, Math.max(0, rawTemp));
    const rawBuffer = parseInt(formData.get('bufferSeconds') as string, 10);
    const bufferSeconds = isNaN(rawBuffer) ? 0 : Math.min(30, Math.max(0, rawBuffer));
    const transferKeywordsRaw = formData.get('transferKeywords') as string;
    const channelIds = formData.getAll('channelIds') as string[];
    const dataCaptureEnabled = formData.get('dataCaptureEnabled') !== 'off';
    const captureFieldsRaw2 = formData.get('captureFields') as string;
    let captureFields: any = null;
    if (captureFieldsRaw2) {
        try { captureFields = JSON.parse(captureFieldsRaw2); } catch {}
    }
    const calendarEnabled = formData.get('calendarEnabled') === 'on';
    const calendarId = (formData.get('calendarId') as string)?.trim() || 'primary';
    const ecommerceEnabled = formData.get('ecommerceEnabled') === 'on';
    const crmEnabled = formData.get('crmEnabled') === 'on';

    if (!id || !name || !systemPrompt) return 'Error: Campos requeridos faltantes.';

    const finalAgentType = (AI_AGENT_TYPES as readonly string[]).includes(agentType) ? agentType : 'CUSTOM';

    const transferKeywords = transferKeywordsRaw
        ? transferKeywordsRaw.split(',').map(k => k.trim()).filter(Boolean).slice(0, 50)
        : ['humano', 'agente', 'persona'];

    const webhookParsed = await parseWebhookConfig(formData);
    if (!webhookParsed.ok) return `Error: ${webhookParsed.error}`;
    const webhookConfigJson = webhookParsed.value;

    try {
        const validChannels = await prisma.channel.findMany({
            where: { id: { in: channelIds }, companyId: session.user.companyId },
            select: { id: true },
        });

        await prisma.aiAgent.update({
            where: { id, companyId: session.user.companyId },
            data: {
                name,
                agentType: finalAgentType,
                systemPrompt,
                contextInfo: contextInfo || null,
                model,
                temperature,
                bufferSeconds,
                transferKeywords,
                dataCaptureEnabled,
                captureFields: captureFields ?? Prisma.JsonNull,
                calendarEnabled,
                calendarId,
                ecommerceEnabled,
                crmEnabled,
                webhookConfigJson: webhookConfigJson ?? Prisma.JsonNull,
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

export interface TestWebhookResult {
    ok: boolean;
    status?: number;
    error?: string;
    hint?: string;
    durationMs?: number;
}

/**
 * Send a sample payload to a webhook URL so the user can verify the integration
 * before relying on it in production. Single attempt (no retries) for fast feedback.
 */
export async function testWebhook(input: {
    url: string;
    secret?: string;
    headers?: Record<string, string>;
}): Promise<TestWebhookResult> {
    const session = await auth();
    if (!session?.user?.companyId) return { ok: false, error: 'No autorizado.' };

    const url = (input.url || '').trim();
    if (!url) return { ok: false, error: 'Ingresa una URL de webhook primero.' };

    // n8n test URLs only work for a single call right after clicking "Execute workflow".
    if (url.includes('/webhook-test/')) {
        return {
            ok: false,
            error: 'La URL es de PRUEBA de n8n (/webhook-test/).',
            hint: 'Esa URL solo funciona una vez tras pulsar "Execute workflow" en n8n. Activa el workflow y usa la URL de producción (/webhook/...).',
        };
    }

    const validated = await validateExternalWebhookUrl(url);
    if (!validated.ok) return { ok: false, error: validated.error };

    const payload = buildWebhookPayload(
        'test-conversation',
        [
            { fieldName: 'nombre', fieldValue: 'Prueba Varylo' },
            { fieldName: 'telefono', fieldValue: '+573000000000' },
            { fieldName: 'email', fieldValue: 'prueba@varylo.app' },
        ],
        [],
        'ai_agent.test',
    );

    const startedAt = Date.now();
    const result = await sendWebhook(
        { url, secret: input.secret, headers: input.headers },
        payload,
        { retries: 0 },
    );
    const durationMs = Date.now() - startedAt;

    let hint: string | undefined;
    if (!result.ok) {
        if (result.status === 404) {
            hint = 'El endpoint respondió 404: la ruta no existe o el workflow no está activo en el sistema externo.';
        } else if (result.status === 401 || result.status === 403) {
            hint = 'El endpoint rechazó la petición (auth). Revisa el secret o las cabeceras requeridas.';
        } else if (/abort|timeout/i.test(result.error || '')) {
            hint = 'El endpoint no respondió a tiempo (15s). Verifica que el servidor esté en línea.';
        }
    }

    return { ok: result.ok, status: result.status, error: result.error, hint, durationMs };
}
