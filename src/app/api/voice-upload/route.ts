import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToStorage, buildMediaPath } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/**
 * POST /api/voice-upload
 * Accepts audio file via FormData, uploads to Supabase, returns public URL.
 * This avoids base64/data-url/server-action limitations.
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file || file.size === 0) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (file.size > 16 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 16MB)' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name || `voice-note-${Date.now()}.webm`;
        const mimeType = file.type || 'audio/webm';

        const path = buildMediaPath(session.user.companyId, fileName);
        const publicUrl = await uploadToStorage(buffer, path, mimeType);

        if (!publicUrl) {
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
        }

        return NextResponse.json({ url: publicUrl, mimeType, fileName });
    } catch (error) {
        console.error('[voice-upload] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
