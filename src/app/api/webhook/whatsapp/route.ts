import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { runAutomationPipeline } from '@/jobs/pipeline';
import { createHmac } from 'crypto';
import { findLeastBusyAgent } from '@/lib/assign-agent';

const MAX_MESSAGE_LENGTH = 4096;

/** Verify Meta X-Hub-Signature-256 header */
function verifyWebhookSignature(rawBody: Buffer, signature: string | null): boolean {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
        console.error('[WhatsApp] META_APP_SECRET not configured');
        return false;
    }
    if (!signature || !signature.startsWith('sha256=')) return false;

    const expectedSignature = createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');
    const expected = `sha256=${expectedSignature}`;
    const match = expected === signature;
    if (!match) {
        console.error('[WhatsApp] MISMATCH — received:', signature.substring(0, 20), '... expected:', expected.substring(0, 20), '... secret starts with:', appSecret.substring(0, 4));
    }
    return match;
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
    console.log('[WhatsApp POST] Request received');
    try {
        const rawBuffer = Buffer.from(await req.arrayBuffer());

        // Verify webhook signature from Meta
        const signature = req.headers.get('x-hub-signature-256');
        console.log('[WhatsApp POST] Signature present:', !!signature, 'Body length:', rawBuffer.length);
        if (!verifyWebhookSignature(rawBuffer, signature)) {
            console.error('[WhatsApp POST] Signature verification FAILED');
            return new NextResponse('Forbidden', { status: 403 });
        }
        console.log('[WhatsApp POST] Signature OK');

        const body = JSON.parse(rawBuffer.toString('utf-8'));

        // Check if it's a WhatsApp status update or message
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (value?.messages) {
            const message = value.messages[0];
            const from = message.from; // Phone number
            const text = message.text?.body;
            const messageId = message.id;
            const phoneNumberId = value.metadata?.phone_number_id;

            if (!text?.trim() || !phoneNumberId) return NextResponse.json({ status: 'ignored' });

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
                // Should find open conversation
                let conversation = await prisma.conversation.findFirst({
                    where: {
                        companyId,
                        contactId: contact.id,
                        status: 'OPEN'
                    }
                });

                if (!conversation) {
                    // Check if there's an active AI agent or chatbot for this channel
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

                // Save Message
                await prisma.message.create({
                    data: {
                        companyId,
                        conversationId: conversation.id,
                        direction: MessageDirection.INBOUND,
                        from: from,
                        to: phoneNumberId,
                        content: text,
                        providerMessageId: messageId,
                    }
                });

                // Update conversation timestamps
                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { lastMessageAt: new Date(), lastInboundAt: new Date() }
                });

                // Automation pipeline with channel priority
                runAutomationPipeline(conversation.id, text, channel.automationPriority);
            }
        }

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('[WhatsApp Webhook] Processing error:', error instanceof Error ? error.message : 'Unknown');
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
