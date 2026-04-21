import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { runAutomationPipeline } from '@/jobs/pipeline';
import { createHmac, timingSafeEqual } from 'crypto';
import { findLeastBusyAgent } from '@/lib/assign-agent';
import { rateLimitResponse } from '@/lib/rate-limit';

export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 4096;

/** Verify Meta X-Hub-Signature-256 header against a given appSecret */
function verifySignatureWithSecret(rawBody: Buffer, signature: string, appSecret: string): boolean {
    const expectedSignature = createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');
    const expected = Buffer.from(`sha256=${expectedSignature}`, 'utf8');
    const actual = Buffer.from(signature, 'utf8');
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
}

/**
 * Verify webhook signature trying:
 * 1. Global META_APP_SECRET env var
 * 2. Each Instagram channel's appSecret from configJson
 */
async function verifyWebhookSignature(rawBody: Buffer, signature: string | null): Promise<boolean> {
    if (!signature || !signature.startsWith('sha256=')) return false;

    // Try global env var first (backwards compatible)
    const globalSecret = process.env.META_APP_SECRET;
    if (globalSecret) {
        if (verifySignatureWithSecret(rawBody, signature, globalSecret)) return true;
    }

    // Try each Instagram channel's appSecret
    const channels = await prisma.channel.findMany({
        where: { type: ChannelType.INSTAGRAM, status: 'CONNECTED' },
        select: { configJson: true },
    });

    for (const ch of channels) {
        const config = ch.configJson as { appSecret?: string } | null;
        if (config?.appSecret) {
            if (verifySignatureWithSecret(rawBody, signature, config.appSecret)) return true;
        }
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
    const envVerifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;
    if (envVerifyToken && token === envVerifyToken) {
        return new NextResponse(challenge, { status: 200 });
    }

    // Fallback: Check if it matches any channel token
    try {
        const matchingChannel = await prisma.channel.findFirst({
            where: {
                type: ChannelType.INSTAGRAM,
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
    const rateLimited = rateLimitResponse(req, { prefix: 'wh-instagram', limit: 200, windowSeconds: 60 });
    if (rateLimited) return rateLimited;

    try {
        const rawBuffer = Buffer.from(await req.arrayBuffer());

        const signature = req.headers.get('x-hub-signature-256');
        const signatureValid = await verifyWebhookSignature(rawBuffer, signature);
        if (!signatureValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        const body = JSON.parse(rawBuffer.toString('utf-8'));

        // Check format
        const entry = body.entry?.[0];
        const messaging = entry?.messaging?.[0];
        // Instagram sometimes sends 'messaging' array inside entry. 
        // Or if it's a Page subscription, it might look like: entry[0].changes[0].value... or entry[0].messaging...
        // For Instagram Messaging, it's typically:
        // entry: [{ id: "PAGE_ID", messaging: [{ sender: {id: "USER_ID"}, recipient: {id: "PAGE_ID"}, message: {...} }] }]

        // Let's handle both standard messaging and changes (just in case)
        const messageEvent = messaging || (entry?.changes?.[0]?.value?.messages?.[0] ? {
            sender: { id: entry.changes[0].value.messages[0].from },
            recipient: { id: entry.changes[0].value.metadata.phone_number_id }, // wait, this is whatsapp structure.
            message: {
                text: entry.changes[0].value.messages[0].text.body,
                mid: entry.changes[0].value.messages[0].id
            }
        } : null);

        // Actually, Instagram Messaging webhook payload for Direct Messages:
        // entry: [ { id: "IG_USER_ID_OF_PAGE", time: ..., messaging: [ { sender: {id: "IG_SID"}, recipient: {id: "IG_USER_ID_OF_PAGE"}, message: { mid: "...", text: "..." } } ] } ]

        if (messaging && messaging.message) {
            const senderId = messaging.sender.id;
            const recipientId = messaging.recipient.id; // This is the Page's IG User ID
            const text = messaging.message.text;
            const messageId = messaging.message.mid;

            if (!text?.trim() || !recipientId) return NextResponse.json({ status: 'ignored' });

            // Validate message length
            if (text.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ status: 'ignored' });

            // Find the channel by pageId or instagramId using JSON filtering.
            // Use orderBy updatedAt desc to always pick the most recently connected channel
            // in case the same Instagram account is connected to multiple companies.
            let channel = await prisma.channel.findFirst({
                where: {
                    type: ChannelType.INSTAGRAM,
                    status: 'CONNECTED',
                    configJson: { path: ['pageId'], equals: recipientId },
                },
                orderBy: { updatedAt: 'desc' },
            });
            if (!channel) {
                channel = await prisma.channel.findFirst({
                    where: {
                        type: ChannelType.INSTAGRAM,
                        status: 'CONNECTED',
                        configJson: { path: ['igAccountId'], equals: recipientId },
                    },
                    orderBy: { updatedAt: 'desc' },
                });
            }
            if (!channel) {
                channel = await prisma.channel.findFirst({
                    where: {
                        type: ChannelType.INSTAGRAM,
                        status: 'CONNECTED',
                        configJson: { path: ['instagramId'], equals: recipientId },
                    },
                    orderBy: { updatedAt: 'desc' },
                });
            }

            if (!channel) {
                // Log all Instagram channels to debug ID mismatch
                const allIgChannels = await prisma.channel.findMany({
                    where: { type: ChannelType.INSTAGRAM },
                    select: { id: true, companyId: true, status: true, configJson: true },
                });
                console.error(`[Instagram Webhook] No channel found for recipientId: ${recipientId}, senderId: ${senderId}`);
                console.error(`[Instagram Webhook] Available channels:`, JSON.stringify(allIgChannels.map(c => ({
                    id: c.id,
                    status: c.status,
                    pageId: (c.configJson as any)?.pageId,
                    igAccountId: (c.configJson as any)?.igAccountId,
                })), null, 2));
                return NextResponse.json({ status: 'no_channel' });
            }

            {
                const companyId = channel.companyId;

                // Find or create Contact
                let contact = await prisma.contact.findFirst({
                    where: { companyId, phone: senderId } // Storing IG SID in 'phone' for MVP uniqueness, or add a new field.
                    // 'phone' is a required string. Using it for external IDs is a common hack in MVPs.
                });

                if (!contact) {
                    // Fetch real Instagram username from Meta Graph API
                    let igName = 'Instagram User';
                    try {
                        const channelConfig = channel.configJson as { accessToken?: string } | null;
                        if (channelConfig?.accessToken) {
                            const profileRes = await fetch(
                                `https://graph.facebook.com/v21.0/${senderId}?fields=name,username&access_token=${channelConfig.accessToken}`
                            );
                            if (profileRes.ok) {
                                const profile = await profileRes.json();
                                igName = profile.name || profile.username || igName;
                            }
                        }
                    } catch {
                        // Fallback to default name
                    }

                    contact = await prisma.contact.create({
                        data: {
                            companyId,
                            phone: senderId,
                            name: igName,
                            companyName: "Instagram",
                            originChannel: ChannelType.INSTAGRAM,
                        }
                    });
                } else if (!contact.originChannel) {
                    await prisma.contact.update({
                        where: { id: contact.id },
                        data: { originChannel: ChannelType.INSTAGRAM },
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
                    // Check if there's an active AI agent for this channel
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
                        // Assign to agent with fewest open conversations, or COMPANY_ADMIN
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

                // Deduplicate: skip if already processed
                if (messageId) {
                    const existing = await prisma.message.findFirst({
                        where: { providerMessageId: messageId, companyId },
                        select: { id: true },
                    });
                    if (existing) {
                        return NextResponse.json({ status: 'duplicate' });
                    }
                }

                // Save Message
                try {
                    await prisma.message.create({
                        data: {
                            companyId,
                            conversationId: conversation.id,
                            direction: MessageDirection.INBOUND,
                            from: senderId,
                            to: recipientId,
                            content: text,
                            providerMessageId: messageId,
                        }
                    });
                } catch (err: any) {
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

                // Automation pipeline — run after response so Vercel doesn't kill it
                after(runAutomationPipeline(conversation.id, text, channel.automationPriority));
            }
        }

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('[Instagram Webhook] Processing error:', error instanceof Error ? error.message : 'Unknown');
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
