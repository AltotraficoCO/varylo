import { NextRequest, NextResponse } from 'next/server';
import { toFile } from 'openai';
import { auth } from '@/auth';
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

/**
 * POST /api/transcribe  { messageId }
 * Transcribes an audio message to text (on demand) using OpenAI Whisper and
 * caches the result on the Message record. Returns { transcription }.
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let messageId: string | undefined;
    try {
        ({ messageId } = await req.json());
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    if (!messageId) {
        return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    const message = await prisma.message.findFirst({
        where: { id: messageId, companyId: session.user.companyId },
        include: { conversation: { include: { channel: true } } },
    });

    if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (message.mediaType !== 'audio' || !message.mediaUrl) {
        return NextResponse.json({ error: 'Message has no audio' }, { status: 400 });
    }

    // Return the cached transcription if we already have one.
    if (message.transcription) {
        return NextResponse.json({ transcription: message.transcription });
    }

    // Resolve the audio bytes from wherever the file lives.
    let buffer: Buffer;
    try {
        buffer = await loadAudioBuffer(message);
    } catch (err) {
        console.error('[Transcribe] Failed to load audio:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Could not load audio' }, { status: 502 });
    }

    const ext = MIME_TO_EXT[(message.mimeType || '').toLowerCase()] || 'ogg';
    const contentType = message.mimeType || 'audio/ogg';

    try {
        const { client } = await getOpenAIForCompany(session.user.companyId);
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

        return NextResponse.json({ transcription });
    } catch (err: any) {
        console.error('[Transcribe] OpenAI error:', err?.message || err);
        const status = err?.status === 401 ? 401 : 502;
        return NextResponse.json(
            { error: status === 401 ? 'OpenAI API key missing or invalid' : 'Transcription failed' },
            { status },
        );
    }
}

/** Fetch the raw audio bytes for a message (Supabase URL, Meta CDN, or data URL). */
async function loadAudioBuffer(message: {
    mediaUrl: string | null;
    mimeType: string | null;
    conversation: { channel: { type: string; configJson: unknown } };
}): Promise<Buffer> {
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
