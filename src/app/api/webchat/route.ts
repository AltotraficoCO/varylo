import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ChannelType, MessageDirection } from '@prisma/client';
import { runAutomationPipeline } from '@/jobs/pipeline';
import { findLeastBusyAgent } from '@/lib/assign-agent';
import { rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 4096;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

function getCorsHeaders(req?: NextRequest): Record<string, string> {
    const allowedOrigins = process.env.WEBCHAT_ALLOWED_ORIGINS?.split(',').map(o => o.trim());
    const origin = req?.headers.get('origin') || '';

    // Strict CORS: require explicit allowed origins in production
    const isDev = process.env.NODE_ENV === 'development';
    let allowedOrigin: string;
    if (allowedOrigins && allowedOrigins.length > 0) {
        allowedOrigin = allowedOrigins.includes(origin) ? origin : 'null';
    } else if (isDev) {
        allowedOrigin = origin || '*';
    } else {
        allowedOrigin = 'null'; // Block all if not configured in production
    }

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-webchat-key',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
    };
}

export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

/** Find the WEB_CHAT channel by API key using indexed JSON query */
async function findChannelByKey(apiKey: string) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length > 100) return null;
    return prisma.channel.findFirst({
        where: {
            type: ChannelType.WEB_CHAT,
            status: 'CONNECTED',
            configJson: { path: ['apiKey'], equals: apiKey },
        },
    });
}

/**
 * POST /api/webchat  — send a message (creates session automatically on first message)
 * GET  /api/webchat?sessionId=xxx&after=timestamp  — poll for messages
 */
export async function POST(req: NextRequest) {
    // Rate limit: 30 messages per minute per IP
    const rateLimited = rateLimitResponse(req, { prefix: 'webchat-post', limit: 30, windowSeconds: 60 });
    if (rateLimited) return rateLimited;

    try {
        const apiKey = req.headers.get('x-webchat-key');
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing x-webchat-key header' }, { status: 401, headers: getCorsHeaders(req) });
        }

        const channel = await findChannelByKey(apiKey);
        if (!channel) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: getCorsHeaders(req) });
        }

        const body = await req.json();
        const { content, sessionId, visitorName, visitorEmail, origin: visitorOrigin } = body;

        if (!content?.trim() || typeof content !== 'string' || content.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json({ error: 'Invalid content' }, { status: 400, headers: getCorsHeaders(req) });
        }

        // Validate optional fields
        if (visitorName && (typeof visitorName !== 'string' || visitorName.length > MAX_NAME_LENGTH)) {
            return NextResponse.json({ error: 'Invalid name' }, { status: 400, headers: getCorsHeaders(req) });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (visitorEmail && (typeof visitorEmail !== 'string' || visitorEmail.length > MAX_EMAIL_LENGTH || !emailRegex.test(visitorEmail))) {
            return NextResponse.json({ error: 'Invalid email' }, { status: 400, headers: getCorsHeaders(req) });
        }

        // If no sessionId, create session on the fly with the first message
        let currentSessionId = sessionId;
        let conversation;

        if (!currentSessionId) {
            // Use Origin header or body origin as website identifier
            const originUrl = visitorOrigin || req.headers.get('origin') || req.headers.get('referer') || 'Web';
            const result = await createSession(channel, { visitorName, visitorEmail, origin: originUrl });
            currentSessionId = result.conversationId;
            conversation = result.conversation;
        } else {
            conversation = await prisma.conversation.findFirst({
                where: {
                    id: currentSessionId,
                    companyId: channel.companyId,
                    channelId: channel.id,
                },
                include: { contact: true },
            });
        }

        if (!conversation) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404, headers: getCorsHeaders(req) });
        }

        // Save inbound message
        const message = await prisma.message.create({
            data: {
                companyId: channel.companyId,
                conversationId: currentSessionId,
                direction: MessageDirection.INBOUND,
                from: conversation.contact.name || 'Visitante Web',
                to: 'webchat',
                content: content.trim(),
            },
        });

        // Update conversation timestamps
        await prisma.conversation.update({
            where: { id: currentSessionId },
            data: { lastMessageAt: new Date(), lastInboundAt: new Date() },
        });

        // Run automation pipeline and wait for response
        console.log(`[WebChat] Running pipeline for conversation ${currentSessionId}, priority: ${channel.automationPriority}`);
        await runAutomationPipeline(currentSessionId, content.trim(), channel.automationPriority);
        console.log(`[WebChat] Pipeline completed for conversation ${currentSessionId}`);

        // Fetch any new messages generated by the pipeline (AI/chatbot responses)
        const responses = await prisma.message.findMany({
            where: {
                conversationId: currentSessionId,
                createdAt: { gt: message.createdAt },
            },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                direction: true,
                content: true,
                from: true,
                createdAt: true,
            },
        });

        return NextResponse.json(
            { sessionId: currentSessionId, messageId: message.id, responses },
            { headers: getCorsHeaders(req) }
        );
    } catch (error) {
        console.error('[WebChat] Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: getCorsHeaders(req) });
    }
}

export async function GET(req: NextRequest) {
    try {
        const apiKey = req.headers.get('x-webchat-key');
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing x-webchat-key header' }, { status: 401, headers: getCorsHeaders(req) });
        }

        const channel = await findChannelByKey(apiKey);
        if (!channel) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: getCorsHeaders(req) });
        }

        const sessionId = req.nextUrl.searchParams.get('sessionId');
        const after = req.nextUrl.searchParams.get('after');

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400, headers: getCorsHeaders(req) });
        }

        // Verify conversation belongs to this channel's company
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: sessionId,
                companyId: channel.companyId,
                channelId: channel.id,
            },
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404, headers: getCorsHeaders(req) });
        }

        const messages = await prisma.message.findMany({
            where: {
                conversationId: sessionId,
                ...(after ? { createdAt: { gt: new Date(after) } } : {}),
            },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                direction: true,
                content: true,
                from: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ messages }, { headers: getCorsHeaders(req) });
    } catch (error) {
        console.error('[WebChat] Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: getCorsHeaders(req) });
    }
}

/** Creates contact + conversation, returns the conversation with contact included */
async function createSession(
    channel: { id: string; companyId: string; automationPriority: any },
    opts: { visitorName?: string; visitorEmail?: string; origin?: string }
) {
    const companyId = channel.companyId;

    // Extract clean domain from origin URL
    let originDomain = 'Web';
    try {
        if (opts.origin && opts.origin !== 'Web') {
            originDomain = new URL(opts.origin).hostname.replace(/^www\./, '');
        }
    } catch {
        originDomain = opts.origin || 'Web';
    }

    const name = opts.visitorName || `Visitante ${originDomain}`;

    // Deduplicate: find existing contact by email or phone (domain)
    let contact = null;

    if (opts.visitorEmail) {
        contact = await prisma.contact.findFirst({
            where: { companyId, email: opts.visitorEmail },
        });
    }

    if (!contact) {
        contact = await prisma.contact.create({
            data: {
                companyId,
                phone: originDomain,
                name,
                email: opts.visitorEmail || undefined,
                originChannel: ChannelType.WEB_CHAT,
            },
        });
    } else if (!contact.originChannel) {
        await prisma.contact.update({
            where: { id: contact.id },
            data: { originChannel: ChannelType.WEB_CHAT },
        });
    }

    // Check for active AI agent on this channel
    const activeAiAgent = await prisma.aiAgent.findFirst({
        where: {
            companyId,
            active: true,
            channels: { some: { id: channel.id } },
        },
    });

    let conversation;

    if (activeAiAgent) {
        conversation = await prisma.conversation.create({
            data: {
                companyId,
                channelId: channel.id,
                contactId: contact.id,
                status: 'OPEN',
                handledByAiAgentId: activeAiAgent.id,
            },
            include: { contact: true },
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
                assignedAgents: selectedAgentId ? { connect: { id: selectedAgentId } } : undefined,
            },
            include: { contact: true },
        });
    }

    return { conversationId: conversation.id, conversation };
}
