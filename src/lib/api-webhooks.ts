import { prisma } from '@/lib/prisma';
import { createHmac } from 'crypto';

function sendWebhook(url: string, body: string, secret: string | null, event: string) {
    const signature = secret
        ? createHmac('sha256', secret).update(body).digest('hex')
        : '';

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Varylo-Signature': signature,
            'X-Varylo-Event': event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
    }).catch((err) => {
        console.error(`[webhook-dispatch] Failed to send ${event} to ${url}:`, err instanceof Error ? err.message : 'Unknown');
    });
}

/**
 * Dispatch a webhook event to all API keys and webhook integrations
 * (n8n, Zapier, Make, etc.) of a company that are subscribed to the event.
 */
export async function dispatchWebhookEvent(
    companyId: string,
    event: string,
    payload: Record<string, any>
) {
    const [apiKeys, integrations] = await Promise.all([
        prisma.apiKey.findMany({
            where: {
                companyId,
                active: true,
                webhookUrl: { not: null },
                webhookEvents: { has: event },
            },
            select: { webhookUrl: true, webhookSecret: true },
        }),
        prisma.webhookIntegration.findMany({
            where: {
                companyId,
                active: true,
                events: { has: event },
            },
            select: { id: true, webhookUrl: true, secret: true },
        }),
    ]);

    if (apiKeys.length === 0 && integrations.length === 0) return;

    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

    for (const key of apiKeys) {
        if (!key.webhookUrl) continue;
        sendWebhook(key.webhookUrl, body, key.webhookSecret, event);
    }

    for (const integration of integrations) {
        sendWebhook(integration.webhookUrl, body, integration.secret, event);
        // Update lastUsedAt (fire and forget)
        prisma.webhookIntegration.update({
            where: { id: integration.id },
            data: { lastUsedAt: new Date() },
        }).catch(() => {});
    }
}
