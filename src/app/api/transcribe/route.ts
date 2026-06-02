import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { transcribeMessage, TranscriptionError } from '@/lib/transcribe';

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

    try {
        const transcription = await transcribeMessage(message);
        return NextResponse.json({ transcription });
    } catch (err) {
        if (err instanceof TranscriptionError) {
            switch (err.kind) {
                case 'no_audio':
                    return NextResponse.json({ error: 'Message has no audio' }, { status: 400 });
                case 'load_failed':
                    return NextResponse.json({ error: 'Could not load audio' }, { status: 502 });
                case 'openai_auth':
                    return NextResponse.json({ error: 'OpenAI API key missing or invalid' }, { status: 401 });
                default:
                    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
            }
        }
        console.error('[Transcribe] Unexpected error:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
    }
}
