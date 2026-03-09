/**
 * WhatsApp media utilities.
 * Handles downloading media from Meta's API and extracting media info from webhooks.
 */

interface MediaInfo {
    url: string;
    mimeType: string;
    fileName?: string;
}

/**
 * Get the CDN download URL for a WhatsApp media object.
 * Returns the Meta CDN URL (temporary, ~5 min validity) and mime type.
 */
export async function getWhatsAppMediaUrl(
    mediaId: string,
    accessToken: string,
): Promise<MediaInfo | null> {
    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
            console.error('[WhatsApp Media] Meta API error:', res.status, await res.text().catch(() => ''));
            return null;
        }

        const data = await res.json();
        const mediaUrl = data.url;
        const mimeType = data.mime_type || 'application/octet-stream';

        if (!mediaUrl) return null;

        return {
            url: mediaUrl,
            mimeType,
            fileName: data.filename || undefined,
        };
    } catch (error) {
        console.error('[WhatsApp Media] Failed to fetch media URL:', error instanceof Error ? error.message : 'Unknown');
        return null;
    }
}

/**
 * Download media binary from Meta CDN URL and return as base64 data URL.
 * This requires the auth token because Meta CDN URLs are protected.
 */
export async function downloadWhatsAppMedia(
    cdnUrl: string,
    accessToken: string,
    mimeType: string,
): Promise<string | null> {
    try {
        const res = await fetch(cdnUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
            console.error('[WhatsApp Media] Download failed:', res.status);
            return null;
        }

        const buffer = await res.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        console.error('[WhatsApp Media] Download error:', error instanceof Error ? error.message : 'Unknown');
        return null;
    }
}

/**
 * Extract media info from a WhatsApp webhook message object.
 * Returns null if the message is text-only.
 */
export function extractMediaFromMessage(message: any): {
    mediaId: string;
    mediaType: string;
    mimeType?: string;
    fileName?: string;
    caption?: string;
} | null {
    // Image
    if (message.image) {
        return {
            mediaId: message.image.id,
            mediaType: 'image',
            mimeType: message.image.mime_type,
            caption: message.image.caption,
        };
    }

    // Video
    if (message.video) {
        return {
            mediaId: message.video.id,
            mediaType: 'video',
            mimeType: message.video.mime_type,
            caption: message.video.caption,
        };
    }

    // Audio (voice notes or audio files)
    if (message.audio) {
        return {
            mediaId: message.audio.id,
            mediaType: 'audio',
            mimeType: message.audio.mime_type,
        };
    }

    // Document (PDF, DOC, etc.)
    if (message.document) {
        return {
            mediaId: message.document.id,
            mediaType: 'document',
            mimeType: message.document.mime_type,
            fileName: message.document.filename,
            caption: message.document.caption,
        };
    }

    // Sticker
    if (message.sticker) {
        return {
            mediaId: message.sticker.id,
            mediaType: 'sticker',
            mimeType: message.sticker.mime_type,
        };
    }

    return null;
}
