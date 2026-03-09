/**
 * Download media from WhatsApp Cloud API.
 * Returns the publicly-accessible URL (from Meta CDN) so we can store it directly.
 *
 * Flow: mediaId → GET media URL from Meta → return the download URL
 */

interface MediaInfo {
    url: string;
    mimeType: string;
    fileName?: string;
}

/**
 * Get the download URL for a WhatsApp media object.
 * The URL is temporary (valid for a few minutes) but we store it
 * and can re-fetch if needed.
 */
export async function getWhatsAppMediaUrl(
    mediaId: string,
    accessToken: string,
): Promise<MediaInfo | null> {
    try {
        // Step 1: Get media metadata (includes download URL)
        const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) return null;

        const data = await res.json();
        const mediaUrl = data.url;
        const mimeType = data.mime_type || 'application/octet-stream';

        if (!mediaUrl) return null;

        // Step 2: Download the actual file and convert to base64 data URL
        // Meta media URLs require auth header, so we download and re-host
        const mediaRes = await fetch(mediaUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!mediaRes.ok) return null;

        const buffer = await mediaRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;

        return {
            url: dataUrl,
            mimeType,
            fileName: data.filename || undefined,
        };
    } catch (error) {
        console.error('[WhatsApp Media] Failed to fetch media:', error instanceof Error ? error.message : 'Unknown');
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
