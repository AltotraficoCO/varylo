import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';
import { readChannelSecret } from '@/lib/channel-config';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 16 * 1024 * 1024;
const ALLOWED = new Set([
    'image/jpeg',
    'image/png',
    'video/mp4',
    'video/3gpp',
    'application/pdf',
]);

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appId = process.env.META_APP_ID;
    if (!appId) {
        return NextResponse.json({ error: 'META_APP_ID no configurado.' }, { status: 500 });
    }

    const channel = await prisma.channel.findFirst({
        where: {
            companyId: session.user.companyId,
            type: ChannelType.WHATSAPP,
            status: 'CONNECTED',
        },
    });
    if (!channel?.configJson) {
        return NextResponse.json({ error: 'Canal WhatsApp no configurado.' }, { status: 400 });
    }
    const accessToken = readChannelSecret((channel.configJson as any)?.accessToken);
    if (!accessToken) {
        return NextResponse.json({ error: 'Access token incompleto.' }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Falta el archivo.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
        return NextResponse.json({ error: `El archivo debe ser entre 1 byte y ${MAX_BYTES} bytes.` }, { status: 400 });
    }
    const fileType = file.type || 'application/octet-stream';
    if (!ALLOWED.has(fileType)) {
        return NextResponse.json(
            { error: `Tipo no permitido (${fileType}). Usa JPG, PNG, MP4, 3GP o PDF.` },
            { status: 400 }
        );
    }

    try {
        const startUrl = new URL(`https://graph.facebook.com/v21.0/${appId}/uploads`);
        startUrl.searchParams.set('file_name', file.name || 'upload');
        startUrl.searchParams.set('file_length', String(file.size));
        startUrl.searchParams.set('file_type', fileType);
        startUrl.searchParams.set('access_token', accessToken);

        const startRes = await fetch(startUrl.toString(), { method: 'POST' });
        const startData = await startRes.json().catch(() => ({}));
        if (!startRes.ok || !startData.id) {
            return NextResponse.json(
                { error: (startData as any)?.error?.message || 'No se pudo iniciar el upload.' },
                { status: 502 }
            );
        }

        const sessionId: string = startData.id;
        const buf = Buffer.from(await file.arrayBuffer());

        const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${sessionId}`, {
            method: 'POST',
            headers: {
                Authorization: `OAuth ${accessToken}`,
                file_offset: '0',
            },
            body: buf,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadData.h) {
            return NextResponse.json(
                { error: (uploadData as any)?.error?.message || 'Falló la subida del archivo.' },
                { status: 502 }
            );
        }

        return NextResponse.json({ handle: uploadData.h });
    } catch (err) {
        console.error('[templates/upload]', err);
        return NextResponse.json({ error: 'Error de red al subir el archivo.' }, { status: 500 });
    }
}
