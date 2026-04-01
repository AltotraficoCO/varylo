import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';
import { getWhatsAppMediaUrl, downloadWhatsAppMedia } from '@/lib/whatsapp-media';

/**
 * GET /api/media?messageId=xxx
 * Proxy to serve media for messages.
 * Handles both:
 *   - Supabase Storage URLs (direct fetch with service key if needed)
 *   - Legacy WhatsApp media IDs (wa:<mediaId>) via Meta CDN
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const messageId = req.nextUrl.searchParams.get('messageId');
    if (!messageId) {
        return new NextResponse('Missing messageId', { status: 400 });
    }

    const message = await prisma.message.findFirst({
        where: {
            id: messageId,
            companyId: session.user.companyId,
        },
        include: {
            conversation: {
                include: { channel: true },
            },
        },
    });

    if (!message?.mediaUrl) {
        return new NextResponse('Media not found', { status: 404 });
    }

    // Legacy: WhatsApp media ID (wa:<mediaId>)
    if (message.mediaUrl.startsWith('wa:')) {
        return handleWhatsAppMedia(message);
    }

    // Supabase Storage URL or any HTTP URL — proxy it
    if (message.mediaUrl.startsWith('http')) {
        return handleHttpMedia(message);
    }

    // Data URL fallback (when Supabase upload failed)
    if (message.mediaUrl.startsWith('data:')) {
        const base64Data = message.mediaUrl.split(',')[1];
        if (base64Data) {
            const buffer = Buffer.from(base64Data, 'base64');
            const mime = message.mimeType || 'application/octet-stream';
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': mime,
                    'Cache-Control': 'private, max-age=3600',
                },
            });
        }
    }

    return new NextResponse('Unsupported media format', { status: 400 });
}

/** Proxy WhatsApp media via Meta CDN */
async function handleWhatsAppMedia(message: {
    mediaUrl: string | null;
    fileName: string | null;
    mimeType: string | null;
    conversation: { channel: { type: string; configJson: unknown } };
}) {
    const waMediaId = message.mediaUrl!.replace('wa:', '');
    const channel = message.conversation.channel;

    if (channel.type !== ChannelType.WHATSAPP) {
        return new NextResponse('Unsupported channel', { status: 400 });
    }

    const config = channel.configJson as { accessToken?: string } | null;
    if (!config?.accessToken) {
        return new NextResponse('Channel not configured', { status: 500 });
    }

    const mediaInfo = await getWhatsAppMediaUrl(waMediaId, config.accessToken);
    if (!mediaInfo) {
        return new NextResponse('Failed to fetch media from WhatsApp', { status: 502 });
    }

    const dataUrl = await downloadWhatsAppMedia(mediaInfo.url, config.accessToken, mediaInfo.mimeType);
    if (!dataUrl) {
        return new NextResponse('Failed to download media', { status: 502 });
    }

    const base64Data = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
        headers: {
            'Content-Type': mediaInfo.mimeType,
            'Content-Disposition': message.fileName
                ? `inline; filename="${message.fileName}"`
                : 'inline',
            'Cache-Control': 'private, max-age=3600',
        },
    });
}

/** Proxy HTTP media (Supabase Storage, etc.) */
async function handleHttpMedia(message: {
    mediaUrl: string | null;
    mimeType: string | null;
    fileName: string | null;
}) {
    try {
        const res = await fetch(message.mediaUrl!, {
            headers: {
                // Use service role key for Supabase Storage if it's a Supabase URL
                ...(message.mediaUrl!.includes('supabase') && process.env.SUPABASE_SERVICE_ROLE_KEY
                    ? { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }
                    : {}),
            },
        });

        if (!res.ok) {
            console.error('[MediaProxy] Fetch failed:', res.status, message.mediaUrl);
            return new NextResponse('Failed to fetch media', { status: 502 });
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = message.mimeType || res.headers.get('content-type') || 'application/octet-stream';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': message.fileName
                    ? `inline; filename="${message.fileName}"`
                    : 'inline',
                'Cache-Control': 'private, max-age=3600',
            },
        });
    } catch (error) {
        console.error('[MediaProxy] Error:', error instanceof Error ? error.message : 'Unknown');
        return new NextResponse('Failed to fetch media', { status: 502 });
    }
}
