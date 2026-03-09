import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { runAutomationPipeline } from '@/jobs/pipeline';
import { createHmac, timingSafeEqual } from 'crypto';
import { findLeastBusyAgent } from '@/lib/assign-agent';
import { markWhatsAppMessageAsRead } from '@/lib/channel-sender';
import { rateLimitResponse } from '@/lib/rate-limit';
import { extractMediaFromMessage } from '@/lib/whatsapp-media';

const MAX_MESSAGE_LENGTH = 4096;

/** Verify Meta X-Hub-Signature-256 header using per-channel or global secret */
function verifySignatureWithSecret(rawBody: Buffer, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
    const expected = Buffer.from(`sha256=${expectedSignature}`, 'utf8');
    const actual = Buffer.from(signature, 'utf8');
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
}

async function verifyWebhookSignature(rawBody: Buffer, signature: string | null): Promise<boolean> {
    if (!signature || !signature.startsWith('sha256=')) return false;

    // Try all WhatsApp channel secrets from the database
    const channels = await prisma.channel.findMany({
        where: { type: ChannelType.WHATSAPP },
        select: { configJson: true },
    });

    for (const ch of channels) {
        const config = ch.configJson as { appSecret?: string } | null;
        if (config?.appSecret && verifySignatureWithSecret(rawBody, signature, config.appSecret)) {
            return true;
        }
    }

    // Fallback to global META_APP_SECRET
    const globalSecret = process.env.META_APP_SECRET;
    if (globalSecret && verifySignatureWithSecret(rawBody, signature, globalSecret)) {
        return true;
    }

    return false;
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode !== 'subscribe' || !token || !challenge) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    // Check environment variable (required, no fallback)
    const envVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (envVerifyToken && token === envVerifyToken) {
        return new NextResponse(challenge, { status: 200 });
    }

    // Check against database channels
    try {
        const matchingChannel = await prisma.channel.findFirst({
            where: {
                type: ChannelType.WHATSAPP,
                configJson: {
                    path: ['verifyToken'],
                    equals: token
                }
            }
        });

        if (matchingChannel) {
            return new NextResponse(challenge, { status: 200 });
        }
    } catch {
        // Don't log internal details
    }

    return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
    // Rate limit: 200 requests per minute per IP (Meta sends bursts)
    const rateLimited = rateLimitResponse(req, { prefix: 'wh-whatsapp', limit: 200, windowSeconds: 60 });
    if (rateLimited) return rateLimited;

    try {
        const rawBuffer = Buffer.from(await req.arrayBuffer());

        // Verify webhook signature from Meta
        const signature = req.headers.get('x-hub-signature-256');
        if (!(await verifyWebhookSignature(rawBuffer, signature))) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const body = JSON.parse(rawBuffer.toString('utf-8'));

        // Check if it's a WhatsApp status update or message
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (value?.messages) {
            const message = value.messages[0];
            const from = message.from; // Phone number
            const messageId = message.id;
            const phoneNumberId = value.metadata?.phone_number_id;

            if (!phoneNumberId) return NextResponse.json({ status: 'ignored' });

            // Extract text and/or media from the message
            const text = message.text?.body || '';
            const mediaInfo = extractMediaFromMessage(message);

            // Must have either text or media
            if (!text.trim() && !mediaInfo) return NextResponse.json({ status: 'ignored' });

            // Validate message length
            if (text.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ status: 'ignored' });

            // Find the channel by phoneNumberId using JSON filtering
            const channel = await prisma.channel.findFirst({
                where: {
                    type: ChannelType.WHATSAPP,
                    configJson: {
                        path: ['phoneNumberId'],
                        equals: phoneNumberId,
                    },
                },
            });

            if (channel) {
                const companyId = channel.companyId;
                const config = channel.configJson as { phoneNumberId?: string; accessToken?: string } | null;

                // Mark message as read immediately (blue checkmarks)
                if (config?.accessToken && config?.phoneNumberId && messageId) {
                    markWhatsAppMessageAsRead(config.phoneNumberId, config.accessToken, messageId);
                }

                // Store media reference (download happens on demand via /api/media)
                let mediaUrl: string | undefined;
                let mediaType: string | undefined;
                let mimeType: string | undefined;
                let fileName: string | undefined;

                if (mediaInfo) {
                    mediaUrl = `wa:${mediaInfo.mediaId}`;
                    mediaType = mediaInfo.mediaType;
                    mimeType = mediaInfo.mimeType;
                    fileName = mediaInfo.fileName;
                }

                // Use caption as content for media messages, or a placeholder
                const content = text.trim()
                    || mediaInfo?.caption
                    || (mediaType ? `[${mediaType}]` : '');

                // Find or create Contact
                let contact = await prisma.contact.findFirst({
                    where: { companyId, phone: from }
                });

                if (!contact) {
                    contact = await prisma.contact.create({
                        data: {
                            companyId,
                            phone: from,
                            name: value.contacts?.[0]?.profile?.name || from,
                            originChannel: ChannelType.WHATSAPP,
                        }
                    });
                } else if (!contact.originChannel) {
                    await prisma.contact.update({
                        where: { id: contact.id },
                        data: { originChannel: ChannelType.WHATSAPP },
                    });
                }

                // Find or create Conversation
                let conversation = await prisma.conversation.findFirst({
                    where: {
                        companyId,
                        contactId: contact.id,
                        status: 'OPEN'
                    }
                });

                if (!conversation) {
                    const activeAiAgent = await prisma.aiAgent.findFirst({
                        where: {
                            companyId,
                            active: true,
                            channels: { some: { id: channel.id } },
                        },
                    });

                    if (activeAiAgent) {
                        conversation = await prisma.conversation.create({
                            data: {
                                companyId,
                                channelId: channel.id,
                                contactId: contact.id,
                                status: 'OPEN',
                                handledByAiAgentId: activeAiAgent.id,
                            },
                        });
                    } else {
                        const selectedAgentId = await findLeastBusyAgent(companyId);

                        conversation = await prisma.conversation.create({
                            data: {
                                companyId,
                                channelId: channel.id,
                                contactId: contact.id,
                                status: 'OPEN',
                                assignedAgents: selectedAgentId ? {
                                    connect: { id: selectedAgentId },
                                } : undefined,
                            },
                        });
                    }
                }

                // Save Message with media fields
                await prisma.message.create({
                    data: {
                        companyId,
                        conversationId: conversation.id,
                        direction: MessageDirection.INBOUND,
                        from: from,
                        to: phoneNumberId,
                        content,
                        providerMessageId: messageId,
                        mediaUrl,
                        mediaType,
                        mimeType,
                        fileName,
                    }
                });

                // Update conversation timestamps
                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { lastMessageAt: new Date(), lastInboundAt: new Date() }
                });

                // Automation pipeline — pass text content (media messages may not have text)
                if (content && content !== `[${mediaType}]`) {
                    runAutomationPipeline(conversation.id, content, channel.automationPriority);
                }
            }
        }

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('[WhatsApp Webhook] Processing error:', error instanceof Error ? error.message : 'Unknown');
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
