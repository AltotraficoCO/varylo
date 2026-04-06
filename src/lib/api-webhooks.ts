import { prisma } from '@/lib/prisma';
import { createHmac } from 'crypto';

/**
 * Dispatch a webhook event to all API keys of a company that have
 * a registered webhook URL and are subscribed to the event type.
 */
export async function dispatchWebhookEvent(
    companyId: string,
    event: string,
    payload: Record<string, any>
) {
    const apiKeys = await prisma.apiKey.findMany({
        where: {
            companyId,
            active: true,
            webhookUrl: { not: null },
            webhookEvents: { has: event },
        },
        select: {
            webhookUrl: true,
            webhookSecret: true,
        },
    });

    if (apiKeys.length === 0) return;

    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

    for (const key of apiKeys) {
        if (!key.webhookUrl) continue;

        const signature = key.webhookSecret
            ? createHmac('sha256', key.webhookSecret).update(body).digest('hex')
            : '';

        // Fire and forget - don't block the main flow
        fetch(key.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Varylo-Signature': signature,
                'X-Varylo-Event': event,
            },
            body,
            signal: AbortSignal.timeout(10_000),
        }).catch((err) => {
            console.error(`[webhook-dispatch] Failed to send ${event} to ${key.webhookUrl}:`, err instanceof Error ? err.message : 'Unknown');
        });
    }
}
