import { authenticateApiKey, requireScope } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { readChannelSecret } from '@/lib/channel-config';

/**
 * POST /api/v1/messages
 * Send a WhatsApp message (text or template) to a phone number.
 *
 * Body (text message within 24h window):
 * { "to": "573001234567", "type": "text", "text": "Hello!" }
 *
 * Body (template message):
 * {
 *   "to": "573001234567",
 *   "type": "template",
 *   "template": {
 *     "name": "hello_world",
 *     "language": "es",
 *     "components": []
 *   }
 * }
 */
export async function POST(req: Request) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const scopeError = requireScope(authResult.context, 'messages:write');
    if (scopeError) return scopeError;

    const { companyId } = authResult.context;

    let body: any;
    try {
        body = await req.json();
    } catch {
        return Response.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    const { to, type } = body;

    if (!to || typeof to !== 'string') {
        return Response.json({ success: false, error: 'Field "to" is required (phone number).' }, { status: 400 });
    }

    const phone = to.replace(/[^0-9]/g, '');
    if (phone.length < 10 || phone.length > 15) {
        return Response.json({ success: false, error: 'Invalid phone number.' }, { status: 400 });
    }

    // Get WhatsApp channel
    const channel = await prisma.channel.findFirst({
        where: { companyId, type: ChannelType.WHATSAPP, status: 'CONNECTED' },
        select: { id: true, configJson: true },
    });

    if (!channel?.configJson) {
        return Response.json(
            { success: false, error: 'No WhatsApp channel configured.' },
            { status: 400 }
        );
    }

    const rawConfig = channel.configJson as {
        phoneNumberId?: string;
        accessToken?: unknown;
    };
    const config = {
        phoneNumberId: rawConfig.phoneNumberId,
        accessToken: readChannelSecret(rawConfig.accessToken),
    };

    if (!config.phoneNumberId || !config.accessToken) {
        return Response.json(
            { success: false, error: 'WhatsApp channel credentials incomplete.' },
            { status: 400 }
        );
    }

    // Resolve or create contact
    let contact = await prisma.contact.findFirst({
        where: { companyId, phone },
    });

    if (!contact) {
        contact = await prisma.contact.create({
            data: {
                companyId,
                phone,
                name: body.contactName || phone,
                originChannel: ChannelType.WHATSAPP,
            },
        });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
        where: {
            companyId,
            contactId: contact.id,
            channelId: channel.id,
            status: 'OPEN',
        },
    });

    if (!conversation) {
        conversation = await prisma.conversation.create({
            data: {
                companyId,
                channelId: channel.id,
                contactId: contact.id,
                status: 'OPEN',
            },
        });
    }

    // Build Meta API payload
    let metaPayload: Record<string, any>;
    let messageContent: string;

    if (type === 'template') {
        const tmpl = body.template;
        if (!tmpl?.name || !tmpl?.language) {
            return Response.json(
                { success: false, error: 'Template requires "name" and "language".' },
                { status: 400 }
            );
        }

        const templatePayload: any = {
            name: tmpl.name,
            language: { code: tmpl.language },
        };
        if (tmpl.components && tmpl.components.length > 0) {
            templatePayload.components = tmpl.components;
        }

        metaPayload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: templatePayload,
        };
        messageContent = tmpl.body || `[Template: ${tmpl.name}]`;
    } else {
        // Text message - check 24h window
        const text = body.text;
        if (!text || typeof text !== 'string' || !text.trim()) {
            return Response.json(
                { success: false, error: 'Field "text" is required for text messages.' },
                { status: 400 }
            );
        }

        if (text.length > 4096) {
            return Response.json(
                { success: false, error: 'Text message exceeds 4096 characters.' },
                { status: 400 }
            );
        }

        // Validate 24h window
        if (conversation.lastInboundAt) {
            const elapsed = Date.now() - new Date(conversation.lastInboundAt).getTime();
            const WINDOW_MS = 24 * 60 * 60 * 1000;
            if (elapsed > WINDOW_MS) {
                return Response.json(
                    {
                        success: false,
                        error: '24-hour conversation window expired. Use a template message to restart.',
                        code: 'WINDOW_EXPIRED',
                    },
                    { status: 400 }
                );
            }
        } else {
            return Response.json(
                {
                    success: false,
                    error: 'No inbound messages from contact. Use a template message to initiate.',
                    code: 'WINDOW_EXPIRED',
                },
                { status: 400 }
            );
        }

        metaPayload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: text },
        };
        messageContent = text;
    }

    // Send via Meta API
    try {
        const res = await fetch(
            `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(metaPayload),
            }
        );

        const resData = await res.json().catch(() => ({}));

        if (!res.ok) {
            const errorMsg = (resData as any)?.error?.message || `HTTP ${res.status}`;
            return Response.json(
                { success: false, error: `WhatsApp API error: ${errorMsg}` },
                { status: 502 }
            );
        }

        const providerMessageId = resData?.messages?.[0]?.id;

        // Save message in DB
        const message = await prisma.message.create({
            data: {
                companyId,
                conversationId: conversation.id,
                direction: MessageDirection.OUTBOUND,
                from: config.phoneNumberId,
                to: phone,
                content: messageContent,
                providerMessageId,
            },
        });

        // Update conversation timestamps
        const updateData: any = { lastMessageAt: new Date() };
        if (type === 'template') {
            updateData.lastInboundAt = new Date(); // Template opens 24h window
        }
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: updateData,
        });

        return Response.json({
            success: true,
            message: {
                id: message.id,
                providerMessageId,
                conversationId: conversation.id,
                contactId: contact.id,
                to: phone,
                type,
                status: 'sent',
            },
        });
    } catch (error) {
        console.error('[API v1 /messages] Error:', error);
        return Response.json(
            { success: false, error: 'Failed to send message.' },
            { status: 500 }
        );
    }
}
