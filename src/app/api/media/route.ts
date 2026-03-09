import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';
import { downloadWhatsAppMedia, getWhatsAppMediaUrl } from '@/lib/whatsapp-media';

/**
 * GET /api/media?messageId=xxx
 * Proxy to download WhatsApp media on demand.
 * The mediaUrl field stores the WhatsApp media ID (wa:<mediaId>).
 * This route fetches the actual binary from Meta CDN and returns it.
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

    if (!message?.mediaUrl?.startsWith('wa:')) {
        return new NextResponse('Media not found', { status: 404 });
    }

    const waMediaId = message.mediaUrl.replace('wa:', '');
    const channel = message.conversation.channel;

    if (channel.type !== ChannelType.WHATSAPP) {
        return new NextResponse('Unsupported channel', { status: 400 });
    }

    const config = channel.configJson as { accessToken?: string } | null;
    if (!config?.accessToken) {
        return new NextResponse('Channel not configured', { status: 500 });
    }

    // Step 1: Get the CDN URL from Meta
    const mediaInfo = await getWhatsAppMediaUrl(waMediaId, config.accessToken);
    if (!mediaInfo) {
        return new NextResponse('Failed to fetch media from WhatsApp', { status: 502 });
    }

    // Step 2: Download the actual binary
    const dataUrl = await downloadWhatsAppMedia(mediaInfo.url, config.accessToken, mediaInfo.mimeType);
    if (!dataUrl) {
        return new NextResponse('Failed to download media', { status: 502 });
    }

    // Convert data URL back to binary for response
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
