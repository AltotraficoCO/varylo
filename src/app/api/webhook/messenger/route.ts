import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { runAutomationPipeline } from '@/jobs/pipeline';
import { findLeastBusyAgent } from '@/lib/assign-agent';
import { rateLimitResponse } from '@/lib/rate-limit';

export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 4096;

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode !== 'subscribe' || !token || !challenge) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const envVerifyToken = process.env.MESSENGER_VERIFY_TOKEN;
    if (envVerifyToken && token === envVerifyToken) {
        return new NextResponse(challenge, { status: 200 });
    }

    // Fallback: check any Messenger channel's verifyToken
    try {
        const matchingChannel = await prisma.channel.findFirst({
            where: {
                type: ChannelType.MESSENGER,
                configJson: { path: ['verifyToken'], equals: token },
            },
        });
        if (matchingChannel) {
            return new NextResponse(challenge, { status: 200 });
        }
    } catch {
        // ignore
    }

    return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
    const rateLimited = rateLimitResponse(req, { prefix: 'wh-messenger', limit: 200, windowSeconds: 60 });
    if (rateLimited) return rateLimited;

    try {
        const body = await req.json();

        console.log('[Messenger Webhook] Incoming payload:', JSON.stringify(body, null, 2));

        if (body.object !== 'page') {
            console.log('[Messenger Webhook] Ignored - object is:', body.object);
            return NextResponse.json({ status: 'ignored' });
        }

        const entry = body.entry?.[0];
        const messaging = entry?.messaging?.[0];

        if (!messaging?.message || messaging.message.is_echo) {
            return NextResponse.json({ status: 'ignored' });
        }

        const senderId = messaging.sender.id;
        const recipientId = messaging.recipient.id; // Facebook Page ID
        const text = messaging.message.text;
        const messageId = messaging.message.mid;

        if (!text?.trim() || !recipientId) return NextResponse.json({ status: 'ignored' });
        if (text.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ status: 'ignored' });

        // Find the Messenger channel by pageId
        const channel = await prisma.channel.findFirst({
            where: {
                type: ChannelType.MESSENGER,
                status: 'CONNECTED',
                configJson: { path: ['pageId'], equals: recipientId },
            },
            orderBy: { updatedAt: 'desc' },
        });

        if (!channel) {
            console.error(`[Messenger Webhook] No channel found for pageId: ${recipientId}`);
            return NextResponse.json({ status: 'no_channel' });
        }

        const companyId = channel.companyId;

        // Find or create contact (using PSID in phone field)
        let contact = await prisma.contact.findFirst({
            where: { companyId, phone: senderId },
        });

        if (!contact) {
            // Fetch Messenger profile name
            let displayName = 'Messenger User';
            try {
                const config = channel.configJson as { accessToken?: string } | null;
                if (config?.accessToken) {
                    const profileRes = await fetch(
                        `https://graph.facebook.com/v21.0/${senderId}?fields=name&access_token=${config.accessToken}`
                    );
                    if (profileRes.ok) {
                        const profile = await profileRes.json();
                        displayName = profile.name || displayName;
                    }
                }
            } catch {
                // fallback to default
            }

            contact = await prisma.contact.create({
                data: {
                    companyId,
                    phone: senderId,
                    name: displayName,
                    companyName: 'Messenger',
                    originChannel: ChannelType.MESSENGER,
                },
            });
        } else if (!contact.originChannel) {
            await prisma.contact.update({
                where: { id: contact.id },
                data: { originChannel: ChannelType.MESSENGER },
            });
        }

        // Find or create conversation
        let conversation = await prisma.conversation.findFirst({
            where: { companyId, contactId: contact.id, status: 'OPEN' },
        });

        if (!conversation) {
            const activeAiAgent = await prisma.aiAgent.findFirst({
                where: { companyId, active: true, channels: { some: { id: channel.id } } },
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
                        assignedAgents: selectedAgentId ? { connect: { id: selectedAgentId } } : undefined,
                    },
                });
            }
        }

        // Deduplicate
        if (messageId) {
            const existing = await prisma.message.findFirst({
                where: { providerMessageId: messageId, companyId },
                select: { id: true },
            });
            if (existing) return NextResponse.json({ status: 'duplicate' });
        }

        // Save message
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
                },
            });
        } catch (err: any) {
            if (err?.code === 'P2002') return NextResponse.json({ status: 'duplicate' });
            throw err;
        }

        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date(), lastInboundAt: new Date() },
        });

        after(runAutomationPipeline(conversation.id, text, channel.automationPriority));

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('[Messenger Webhook] Error:', error instanceof Error ? error.message : 'Unknown');
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
