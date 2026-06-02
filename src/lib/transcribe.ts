import { toFile } from 'openai';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';
import { getOpenAIForCompany } from '@/lib/openai';
import { getWhatsAppMediaUrl, downloadWhatsAppMedia } from '@/lib/whatsapp-media';
import { readChannelSecret } from '@/lib/channel-config';

// Whisper-supported file extensions, keyed by the MIME type we store.
const MIME_TO_EXT: Record<string, string> = {
    'audio/ogg': 'ogg',
    'audio/oga': 'oga',
    'audio/opus': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'mp4',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'm4a',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/webm': 'webm',
    'audio/flac': 'flac',
};

/** Shape of a message we can transcribe, including the channel for legacy Meta media. */
export type TranscribableMessage = {
    id: string;
    companyId: string;
    mediaUrl: string | null;
    mediaType: string | null;
    mimeType: string | null;
    transcription: string | null;
    conversation: { channel: { type: string; configJson: unknown } };
};

/** Error thrown by transcribeMessage, carrying a hint for HTTP callers. */
export class TranscriptionError extends Error {
    constructor(message: string, readonly kind: 'no_audio' | 'load_failed' | 'openai_auth' | 'openai_failed') {
        super(message);
        this.name = 'TranscriptionError';
    }
}

/**
 * Transcribe an audio message to text via OpenAI Whisper and cache the result on
 * the Message record. Returns the cached transcription if one already exists.
 * Throws TranscriptionError on failure (callers that want best-effort should use
 * transcribeMessageSafe).
 */
export async function transcribeMessage(message: TranscribableMessage): Promise<string> {
    if (message.mediaType !== 'audio' || !message.mediaUrl) {
        throw new TranscriptionError('Message has no audio', 'no_audio');
    }

    // Return the cached transcription if we already have one.
    if (message.transcription) {
        return message.transcription;
    }

    // Resolve the audio bytes from wherever the file lives.
    let buffer: Buffer;
    try {
        buffer = await loadAudioBuffer(message);
    } catch (err) {
        console.error('[Transcribe] Failed to load audio:', err instanceof Error ? err.message : err);
        throw new TranscriptionError('Could not load audio', 'load_failed');
    }

    const ext = MIME_TO_EXT[(message.mimeType || '').toLowerCase()] || 'ogg';
    const contentType = message.mimeType || 'audio/ogg';

    try {
        const { client } = await getOpenAIForCompany(message.companyId);
        const file = await toFile(buffer, `audio.${ext}`, { type: contentType });
        const result = await client.audio.transcriptions.create({
            file,
            model: 'whisper-1',
        });
        const transcription = (result.text || '').trim();

        await prisma.message.update({
            where: { id: message.id },
            data: { transcription },
        });

        return transcription;
    } catch (err: any) {
        console.error('[Transcribe] OpenAI error:', err?.message || err);
        if (err?.status === 401) {
            throw new TranscriptionError('OpenAI API key missing or invalid', 'openai_auth');
        }
        throw new TranscriptionError('Transcription failed', 'openai_failed');
    }
}

/**
 * Best-effort transcription by message id: fetches the message with its channel,
 * transcribes, and returns the text — or null if it isn't audio / fails. Never
 * throws, so it's safe to call from background flows (e.g. the AI agent).
 */
export async function transcribeMessageSafe(messageId: string, companyId: string): Promise<string | null> {
    try {
        const message = await prisma.message.findFirst({
            where: { id: messageId, companyId },
            include: { conversation: { include: { channel: true } } },
        });
        if (!message) return null;
        return await transcribeMessage(message);
    } catch (err) {
        if (!(err instanceof TranscriptionError)) {
            console.error('[Transcribe] Unexpected error:', err instanceof Error ? err.message : err);
        }
        return null;
    }
}

/** Fetch the raw audio bytes for a message (Supabase URL, Meta CDN, or data URL). */
async function loadAudioBuffer(message: TranscribableMessage): Promise<Buffer> {
    const url = message.mediaUrl!;

    // Legacy WhatsApp media ID (wa:<mediaId>) — fetch via Meta CDN.
    if (url.startsWith('wa:')) {
        const channel = message.conversation.channel;
        if (channel.type !== ChannelType.WHATSAPP) throw new Error('Unsupported channel');
        const config = channel.configJson as { accessToken?: string } | null;
        const waToken = readChannelSecret(config?.accessToken);
        if (!waToken) throw new Error('Channel not configured');
        const mediaInfo = await getWhatsAppMediaUrl(url.replace('wa:', ''), waToken);
        if (!mediaInfo) throw new Error('Media URL fetch failed');
        const dataUrl = await downloadWhatsAppMedia(mediaInfo.url, waToken, mediaInfo.mimeType);
        if (!dataUrl) throw new Error('Media download failed');
        return Buffer.from(dataUrl.split(',')[1], 'base64');
    }

    // Data URL fallback.
    if (url.startsWith('data:')) {
        return Buffer.from(url.split(',')[1], 'base64');
    }

    // Supabase Storage URL or any HTTP URL.
    if (url.startsWith('http')) {
        const res = await fetch(url, {
            headers:
                url.includes('supabase') && process.env.SUPABASE_SERVICE_ROLE_KEY
                    ? { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }
                    : {},
        });
        if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
    }

    throw new Error('Unsupported media format');
}
