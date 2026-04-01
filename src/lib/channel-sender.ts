import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { sendInstagramMessageWithToken } from '@/lib/instagram';
import { uploadDataUrlToStorage, buildMediaPath } from '@/lib/storage';

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
/**
 * Upload media to WhatsApp from a data URL.
 */
async function uploadMediaToWhatsApp(
    phoneNumberId: string,
    accessToken: string,
    dataUrl: string,
    mimeType: string,
    fileName: string,
): Promise<string | null> {
    try {
        const base64Data = dataUrl.split(',')[1];
        if (!base64Data) return null;

        const buffer = Buffer.from(base64Data, 'base64');
        return uploadBufferToWhatsApp(phoneNumberId, accessToken, buffer, mimeType, fileName);
    } catch (error) {
        console.error('[WhatsApp] Media upload failed:', error instanceof Error ? error.message : 'Unknown');
        return null;
    }
}

/**
 * Download a file from URL and upload to WhatsApp media API.
 */
async function uploadUrlToWhatsApp(
    phoneNumberId: string,
    accessToken: string,
    fileUrl: string,
    mimeType: string,
    fileName: string,
): Promise<string | null> {
    try {
        const res = await fetch(fileUrl);
        if (!res.ok) {
            console.error(`[WhatsApp] Failed to download file: ${res.status}`);
            return null;
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        return uploadBufferToWhatsApp(phoneNumberId, accessToken, buffer, mimeType, fileName);
    } catch (error) {
        console.error('[WhatsApp] URL upload failed:', error instanceof Error ? error.message : 'Unknown');
        return null;
    }
}

/**
 * Upload a Buffer to WhatsApp media API.
 */
async function uploadBufferToWhatsApp(
    phoneNumberId: string,
    accessToken: string,
    buffer: Buffer,
    mimeType: string,
    fileName: string,
): Promise<string | null> {
    try {
        const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });

        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', blob, fileName);
        formData.append('type', mimeType);

        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/media`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
        });

        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            console.error(`[WhatsApp] Media upload failed: HTTP ${res.status} - ${errBody}`);
            return null;
        }
        const data = await res.json();
        return data.id || null;
    } catch (error) {
        console.error('[WhatsApp] Buffer upload failed:', error instanceof Error ? error.message : 'Unknown');
        return null;
    }
}

/**
 * Build WhatsApp API payload for media messages using a media ID (uploaded via media API).
 */
function buildWhatsAppMediaPayloadById(
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

/**
 * Build WhatsApp API payload for media messages using a public URL.
 */
function buildWhatsAppMediaPayloadByUrl(
    recipientPhone: string,
    content: string,
    publicUrl: string,
    mediaType: string,
    fileName?: string,
) {
    const base = { messaging_product: 'whatsapp' as const, to: recipientPhone };

    switch (mediaType) {
        case 'image':
            return { ...base, type: 'image', image: { link: publicUrl, caption: content || undefined } };
        case 'video':
            return { ...base, type: 'video', video: { link: publicUrl, caption: content || undefined } };
        case 'audio':
            return { ...base, type: 'audio', audio: { link: publicUrl } };
        case 'document':
            return {
                ...base,
                type: 'document',
                document: { link: publicUrl, caption: content || undefined, filename: fileName || 'document' },
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

    // --- Step 1: Upload media to Supabase if it's a data URL ---
    let storedMediaUrl = mediaUrl;
    if (mediaUrl?.startsWith('data:') && mimeType) {
        const cleanMime = mimeType.split(';')[0];
        const ext = cleanMime.split('/')[1] || 'bin';
        const name = fileName || `outbound.${ext}`;
        const path = buildMediaPath(companyId, name);
        const uploaded = await uploadDataUrlToStorage(mediaUrl, path, cleanMime);
        if (uploaded) storedMediaUrl = uploaded;
    }
    // If mediaUrl is already an HTTP URL (e.g., from voice-upload API), use it directly

    // --- Step 2: Send to external channel ---
    if (channel.type === ChannelType.WHATSAPP) {
        // Block free-form messages when the 24-hour conversation window has expired
        if (conversation.lastInboundAt) {
            const elapsed = Date.now() - new Date(conversation.lastInboundAt).getTime();
            const WINDOW_MS = 24 * 60 * 60 * 1000;
            if (elapsed > WINDOW_MS) {
                throw new Error('WINDOW_EXPIRED: La ventana de 24 horas ha expirado. Debes usar una plantilla para reiniciar la conversación.');
            }
        } else {
            throw new Error('WINDOW_EXPIRED: No hay mensajes entrantes del cliente. Debes usar una plantilla para iniciar la conversación.');
        }

        const config = channel.configJson as { phoneNumberId?: string; accessToken?: string } | null;
        if (config?.accessToken && config?.phoneNumberId) {
            let payload: Record<string, any>;

            if (mediaUrl && mediaType && mimeType) {
                const cleanMime = mimeType.split(';')[0];
                const fileUrl = storedMediaUrl?.startsWith('http') ? storedMediaUrl : null;

                // For audio: WhatsApp only accepts ogg/aac/mp4/mpeg/amr (NOT webm).
                // Chrome records webm which WhatsApp silently drops.
                // Strategy: try media API upload as audio/ogg first.
                // If that fails, send as document (guaranteed delivery).
                if (mediaType === 'audio' && fileUrl) {
                    // Try 1: upload to media API as audio/ogg
                    let waMediaId = await uploadUrlToWhatsApp(
                        config.phoneNumberId,
                        config.accessToken,
                        fileUrl,
                        'audio/ogg',
                        (fileName || 'audio').replace(/\.\w+$/, '.ogg'),
                    );
                    if (waMediaId) {
                        payload = buildWhatsAppMediaPayloadById(contact.phone, content, waMediaId, 'audio');
                    } else {
                        // Try 2: upload as audio/mpeg
                        waMediaId = await uploadUrlToWhatsApp(
                            config.phoneNumberId,
                            config.accessToken,
                            fileUrl,
                            'audio/mpeg',
                            (fileName || 'audio').replace(/\.\w+$/, '.mp3'),
                        );
                        if (waMediaId) {
                            payload = buildWhatsAppMediaPayloadById(contact.phone, content, waMediaId, 'audio');
                        } else {
                            // Try 3: send as document (guaranteed to arrive)
                            payload = buildWhatsAppMediaPayloadByUrl(
                                contact.phone,
                                content || '🎤 Nota de voz',
                                fileUrl,
                                'document',
                                (fileName || 'nota-de-voz.webm'),
                            );
                        }
                    }
                }
                // Non-audio with URL: send URL directly (images, docs, etc.)
                else if (fileUrl) {
                    payload = buildWhatsAppMediaPayloadByUrl(contact.phone, content, fileUrl, mediaType, fileName);
                }
                // Data URL fallback: upload to WhatsApp media API
                else if (mediaUrl.startsWith('data:')) {
                    const waMediaId = await uploadMediaToWhatsApp(
                        config.phoneNumberId,
                        config.accessToken,
                        mediaUrl,
                        cleanMime,
                        fileName || 'file',
                    );
                    if (waMediaId) {
                        payload = buildWhatsAppMediaPayloadById(contact.phone, content, waMediaId, mediaType, fileName);
                    } else {
                        throw new Error('No se pudo enviar el archivo a WhatsApp.');
                    }
                } else {
                    payload = { messaging_product: 'whatsapp', to: contact.phone, type: 'text', text: { body: content } };
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
            throw new Error('Instagram channel not configured');
        }
    }

    // --- Step 3: Save to DB ---
    await prisma.message.create({
        data: {
            companyId,
            conversationId,
            direction: MessageDirection.OUTBOUND,
            from: fromName || 'AI',
            to: contact.phone,
            content,
            mediaUrl: storedMediaUrl,
            mediaType,
            mimeType: mimeType?.split(';')[0], // Store clean mime without codec params
            fileName,
        },
    });

    await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
    });
}
