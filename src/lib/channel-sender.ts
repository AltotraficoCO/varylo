import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { sendInstagramMessageWithToken } from '@/lib/instagram';

interface SendMessageOptions {
    conversationId: string;
    companyId: string;
    content: string;
    fromName?: string;
}

/**
 * Mark a WhatsApp message as read (blue checkmarks).
 */
export async function markWhatsAppMessageAsRead(
    phoneNumberId: string,
    accessToken: string,
    inboundMessageId: string,
) {
    try {
        await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: inboundMessageId,
            }),
        });
    } catch {
        // Non-critical
    }
}

/**
 * Send a typing indicator + mark-as-read to WhatsApp.
 * The typing bubble appears for up to 25 seconds or until the reply is sent.
 */
export async function sendWhatsAppTypingIndicator(
    phoneNumberId: string,
    accessToken: string,
    recipientPhone: string,
    inboundMessageId: string,
) {
    try {
        await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: inboundMessageId,
                typing_indicator: { type: 'text' },
            }),
        });
    } catch {
        // Non-critical – don't block the response if this fails
    }
}

export async function sendChannelMessage({ conversationId, companyId, content, fromName }: SendMessageOptions) {
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
            contact: true,
            channel: true,
        },
    });

    if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
    }

    const { channel, contact } = conversation;

    if (channel.type === ChannelType.WHATSAPP) {
        const config = channel.configJson as { phoneNumberId?: string; accessToken?: string } | null;
        if (config?.accessToken && config?.phoneNumberId) {
            const res = await fetch(`https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: contact.phone,
                    text: { body: content },
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const errorMsg = (errorData as any)?.error?.message || `HTTP ${res.status}`;
                console.error(`[WhatsApp] Failed to send message to ${contact.phone}:`, errorMsg);
                throw new Error(`WhatsApp API error: ${errorMsg}`);
            }
        } else {
            console.error('[WhatsApp] Channel missing accessToken or phoneNumberId');
            throw new Error('WhatsApp channel not configured');
        }
    } else if (channel.type === ChannelType.WEB_CHAT) {
        // Web chat: no external API to call, message is stored in DB below
    } else if (channel.type === ChannelType.INSTAGRAM) {
        const config = channel.configJson as { accessToken?: string; pageId?: string } | null;
        if (config?.accessToken) {
            const result = await sendInstagramMessageWithToken(contact.phone, content, config.accessToken, config.pageId);
            if (!result.success) {
                throw new Error(`Instagram API error: ${result.message}`);
            }
        } else {
            console.error('[Instagram] Channel missing accessToken');
            throw new Error('Instagram channel not configured');
        }
    }

    // Save the message in DB
    await prisma.message.create({
        data: {
            companyId,
            conversationId,
            direction: MessageDirection.OUTBOUND,
            from: fromName || 'AI',
            to: contact.phone,
            content,
        },
    });

    await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
    });
}
