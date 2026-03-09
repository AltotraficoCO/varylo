import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { sendInstagramMessageWithToken } from '@/lib/instagram';

interface SendMessageOptions {
    conversationId: string;
    companyId: string;
    content: string;
    fromName?: string;
    mediaUrl?: string;
    mediaType?: string;  // image, video, audio, document
    mimeType?: string;
    fileName?: string;
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

/**
 * Upload a media file (from a data URL) to WhatsApp Media API.
 * Returns the media ID for use in messages.
 */
async function uploadMediaToWhatsApp(
    phoneNumberId: string,
    accessToken: string,
    dataUrl: string,
    mimeType: string,
    fileName: string,
): Promise<string | null> {
    try {
        // Convert data URL to Buffer
        const base64Data = dataUrl.split(',')[1];
        if (!base64Data) return null;

        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: mimeType });

        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', blob, fileName);
        formData.append('type', mimeType);

        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/media`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
        });

        if (!res.ok) return null;
        const data = await res.json();
        return data.id || null;
    } catch (error) {
        console.error('[WhatsApp] Media upload failed:', error instanceof Error ? error.message : 'Unknown');
        return null;
    }
}

/**
 * Build WhatsApp API payload for text or media messages.
 */
function buildWhatsAppMediaPayload(
    recipientPhone: string,
    content: string,
    waMediaId: string,
    mediaType: string,
    fileName?: string,
) {
    const base = { messaging_product: 'whatsapp' as const, to: recipientPhone };

    switch (mediaType) {
        case 'image':
            return { ...base, type: 'image', image: { id: waMediaId, caption: content || undefined } };
        case 'video':
            return { ...base, type: 'video', video: { id: waMediaId, caption: content || undefined } };
        case 'audio':
            return { ...base, type: 'audio', audio: { id: waMediaId } };
        case 'document':
            return {
                ...base,
                type: 'document',
                document: { id: waMediaId, caption: content || undefined, filename: fileName || 'document' },
            };
        default:
            return { ...base, type: 'text', text: { body: content } };
    }
}

export async function sendChannelMessage({
    conversationId,
    companyId,
    content,
    fromName,
    mediaUrl,
    mediaType,
    mimeType,
    fileName,
}: SendMessageOptions) {
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
            let payload: Record<string, any>;

            // If sending media, upload to WhatsApp first then send with media ID
            if (mediaUrl && mediaType && mimeType) {
                const waMediaId = await uploadMediaToWhatsApp(
                    config.phoneNumberId,
                    config.accessToken,
                    mediaUrl,
                    mimeType,
                    fileName || 'file',
                );

                if (waMediaId) {
                    payload = buildWhatsAppMediaPayload(contact.phone, content, waMediaId, mediaType, fileName);
                } else {
                    // Fallback to text if upload fails
                    payload = { messaging_product: 'whatsapp', to: contact.phone, type: 'text', text: { body: content || '[Archivo no disponible]' } };
                }
            } else {
                payload = { messaging_product: 'whatsapp', to: contact.phone, type: 'text', text: { body: content } };
            }

            const res = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
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
            mediaUrl,
            mediaType,
            mimeType,
            fileName,
        },
    });

    await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
    });
}
