import { authenticateApiKey, requireScope } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { randomBytes, createHmac } from 'crypto';
import { validateExternalWebhookUrl } from '@/lib/url-validator';

/**
 * POST /api/v1/webhooks
 * Register a webhook URL to receive inbound messages and status updates.
 * Body: { "url": "https://example.com/webhook", "events": ["message.received", "message.status"] }
 *
 * GET /api/v1/webhooks
 * Get current webhook configuration.
 *
 * DELETE /api/v1/webhooks
 * Remove the webhook.
 */

const VALID_EVENTS = ['message.received', 'message.status'];

export async function POST(req: Request) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const scopeError = requireScope(authResult.context, 'webhooks:write');
    if (scopeError) return scopeError;

    let body: any;
    try {
        body = await req.json();
    } catch {
        return Response.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { url, events } = body;

    if (!url || typeof url !== 'string') {
        return Response.json({ success: false, error: 'Field "url" is required.' }, { status: 400 });
    }

    // Reject private/loopback/link-local targets (SSRF) and non-https, resolving
    // DNS too — same guard the AI-agent/integration webhooks use.
    const validated = await validateExternalWebhookUrl(url);
    if (!validated.ok) {
        return Response.json({ success: false, error: validated.error }, { status: 400 });
    }
    if (validated.url.protocol !== 'https:') {
        return Response.json({ success: false, error: 'Webhook URL must use HTTPS.' }, { status: 400 });
    }

    const selectedEvents = Array.isArray(events)
        ? events.filter((e: string) => VALID_EVENTS.includes(e))
        : VALID_EVENTS;

    if (selectedEvents.length === 0) {
        return Response.json(
            { success: false, error: `Invalid events. Valid: ${VALID_EVENTS.join(', ')}` },
            { status: 400 }
        );
    }

    const { apiKeyId } = authResult.context;

    // Generate a signing secret for webhook payload verification
    const webhookSecret = randomBytes(32).toString('hex');

    await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: {
            webhookUrl: url,
            webhookEvents: selectedEvents,
            webhookSecret,
        },
    });

    return Response.json({
        success: true,
        webhook: {
            url,
            events: selectedEvents,
            secret: webhookSecret,
            status: 'active',
        },
        note: 'Save the secret — it is used to verify webhook payloads (HMAC-SHA256 in X-Varylo-Signature header).',
    });
}

export async function GET(req: Request) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const { apiKeyId } = authResult.context;

    const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
        select: { webhookUrl: true, webhookEvents: true },
    });

    if (!apiKey?.webhookUrl) {
        return Response.json({
            success: true,
            webhook: null,
        });
    }

    return Response.json({
        success: true,
        webhook: {
            url: apiKey.webhookUrl,
            events: apiKey.webhookEvents,
            status: 'active',
        },
    });
}

export async function DELETE(req: Request) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const scopeError = requireScope(authResult.context, 'webhooks:write');
    if (scopeError) return scopeError;

    const { apiKeyId } = authResult.context;

    await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: {
            webhookUrl: null,
            webhookEvents: [],
            webhookSecret: null,
        },
    });

    return Response.json({ success: true, message: 'Webhook removed.' });
}
