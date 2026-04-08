import { NextRequest, NextResponse, after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { runAutomationPipeline } from '@/jobs/pipeline';
import { createHmac, timingSafeEqual } from 'crypto';
import { findLeastBusyAgent } from '@/lib/assign-agent';
import { markWhatsAppMessageAsRead } from '@/lib/channel-sender';
import { rateLimitResponse } from '@/lib/rate-limit';
import { extractMediaFromMessage, getWhatsAppMediaUrl, downloadWhatsAppMedia } from '@/lib/whatsapp-media';
import { uploadToStorage, buildMediaPath } from '@/lib/storage';
import { dispatchWebhookEvent } from '@/lib/api-webhooks';

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

        // Handle delivery/read status updates
        if (value?.statuses) {
            const status = value.statuses[0];
            const phoneNumberId = value.metadata?.phone_number_id;
            if (status && phoneNumberId) {
                const channel = await prisma.channel.findFirst({
                    where: {
                        type: ChannelType.WHATSAPP,
                        configJson: { path: ['phoneNumberId'], equals: phoneNumberId },
                    },
                    select: { companyId: true },
                });

                if (channel) {
                    dispatchWebhookEvent(channel.companyId, 'message.status', {
                        providerMessageId: status.id,
                        status: status.status, // sent, delivered, read, failed
                        recipientId: status.recipient_id,
                        timestamp: status.timestamp,
                        errors: status.errors || null,
                    });
                }
            }
        }

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

                // Download media from Meta and upload to Supabase Storage
                let mediaUrl: string | undefined;
                let mediaType: string | undefined;
                let mimeType: string | undefined;
                let fileName: string | undefined;

                if (mediaInfo && config?.accessToken) {
                    mediaType = mediaInfo.mediaType;
                    mimeType = mediaInfo.mimeType;
                    fileName = mediaInfo.fileName;

                    const metaMedia = await getWhatsAppMediaUrl(mediaInfo.mediaId, config.accessToken);
                    if (metaMedia) {
                        const mime = metaMedia.mimeType || mediaInfo.mimeType || 'application/octet-stream';
                        const ext = mime.split('/')[1]?.split(';')[0] || 'bin';
                        const name = mediaInfo.fileName || `${mediaInfo.mediaType}.${ext}`;
                        const path = buildMediaPath(companyId, name);

                        // Download binary from Meta CDN
                        const mediaRes = await fetch(metaMedia.url, {
                            headers: { Authorization: `Bearer ${config.accessToken}` },
                        });

                        if (mediaRes.ok) {
                            const buffer = Buffer.from(await mediaRes.arrayBuffer());
                            const storageUrl = await uploadToStorage(buffer, path, mime);
                            if (storageUrl) {
                                mediaUrl = storageUrl;
                                mimeType = mime;
                            }
                        }
                    }
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

                // Auto-create CRM deal for new conversations
                if (conversation.createdAt.getTime() > Date.now() - 5000) {
                    const msgText = text || '';
                    import('@/lib/crm-auto').then(({ autoCreateDeal }) => {
                        autoCreateDeal(companyId, contact.id, conversation.id, msgText);
                    }).catch(() => {});
                }

                // If this is a new conversation, check if we sent a broadcast template
                // to this contact recently and inject it as the first message
                if (conversation.createdAt.getTime() > Date.now() - 5000) {
                    // Conversation was just created — check for recent broadcast sends
                    const recentBroadcastLog = await prisma.broadcastLog.findFirst({
                        where: {
                            contactId: contact.id,
                            status: 'SENT',
                            sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // last 7 days
                        },
                        include: {
                            broadcast: {
                                select: {
                                    templateBody: true,
                                    templateName: true,
                                    createdById: true,
                                    companyId: true,
                                },
                            },
                        },
                        orderBy: { sentAt: 'desc' },
                    });

                    if (recentBroadcastLog?.broadcast) {
                        const bc = recentBroadcastLog.broadcast;
                        const config2 = channel.configJson as { phoneNumberId?: string };
                        await prisma.message.create({
                            data: {
                                companyId,
                                conversationId: conversation.id,
                                direction: MessageDirection.OUTBOUND,
                                from: config2.phoneNumberId || '',
                                to: from,
                                content: bc.templateBody || `[Plantilla: ${bc.templateName}]`,
                                senderId: bc.createdById,
                                timestamp: recentBroadcastLog.sentAt || recentBroadcastLog.createdAt,
                                createdAt: recentBroadcastLog.sentAt || recentBroadcastLog.createdAt,
                            },
                        });
                    }
                }

                // Deduplicate at DB level using unique constraint on (providerMessageId, companyId)
                if (messageId) {
                    const existing = await prisma.message.findFirst({
                        where: { providerMessageId: messageId, companyId },
                        select: { id: true },
                    });
                    if (existing) {
                        return NextResponse.json({ status: 'duplicate' });
                    }
                }

                // Save Message with media fields
                try {
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
                } catch (err: any) {
                    // Unique constraint violation = duplicate message (race condition)
                    if (err?.code === 'P2002') {
                        return NextResponse.json({ status: 'duplicate' });
                    }
                    throw err;
                }

                // Update conversation timestamps
                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { lastMessageAt: new Date(), lastInboundAt: new Date() }
                });

                // Dispatch to external API webhooks (fire and forget)
                dispatchWebhookEvent(companyId, 'message.received', {
                    conversationId: conversation.id,
                    contactId: contact.id,
                    from,
                    content,
                    mediaUrl,
                    mediaType,
                    timestamp: new Date().toISOString(),
                });

                // Automation pipeline — run after response so Vercel keeps function alive
                if (content) {
                    after(runAutomationPipeline(
                        conversation.id,
                        content,
                        channel.automationPriority,
                        mediaUrl ? { mediaUrl, mediaType, mimeType, fileName } : undefined,
                    ));
                }
            }
        }

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('[WhatsApp Webhook] Processing error:', error instanceof Error ? error.message : 'Unknown');
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
