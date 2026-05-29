import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { MessageDirection } from '@prisma/client';
import { handleAiAgentResponse } from '@/jobs/ai-agent';
import { startPlaygroundConversation } from '@/lib/playground';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_MESSAGE_LENGTH = 4096;

/**
 * POST /api/ai-agents/[agentId]/playground
 * Send a simulated customer message to an agent and get its reply, using the
 * real reply engine but on a hidden test conversation (isTest = true).
 *
 * Body: { conversationId?: string, content: string }
 *  - omit conversationId (or send null) to start a fresh test conversation.
 * Returns: { conversationId, responses }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ agentId: string }> },
) {
    const session = await auth();
    if (!session?.user?.companyId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const companyId = session.user.companyId;
    const { agentId } = await params;

    // Verify the agent belongs to the company
    const agent = await prisma.aiAgent.findFirst({
        where: { id: agentId, companyId },
        select: { id: true },
    });
    if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    let body: { conversationId?: string | null; content?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const content = body.content?.trim();
    if (!content || typeof content !== 'string' || content.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }

    // Resolve the test conversation: reuse if provided + valid, else start fresh
    let conversationId = body.conversationId || undefined;
    if (conversationId) {
        const existing = await prisma.conversation.findFirst({
            where: { id: conversationId, companyId, isTest: true },
            select: { id: true },
        });
        if (!existing) conversationId = undefined;
    }
    if (!conversationId) {
        conversationId = await startPlaygroundConversation(companyId, agentId);
    }

    // Save the inbound (simulated customer) message
    const inbound = await prisma.message.create({
        data: {
            companyId,
            conversationId,
            direction: MessageDirection.INBOUND,
            from: 'Prueba',
            to: 'playground',
            content,
        },
    });

    await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), lastInboundAt: new Date() },
    });

    // Run the real reply engine (tools, data capture, credits — all as in production).
    // ignoreActiveCheck lets the user test agents that aren't activated yet.
    try {
        await handleAiAgentResponse(conversationId, content, { ignoreActiveCheck: true });
    } catch (err) {
        console.error('[Playground] Engine error:', err);
        return NextResponse.json(
            { conversationId, responses: [], error: 'El agente no pudo responder. Revisa los créditos o las API keys.' },
            { status: 200 },
        );
    }

    // Return everything created after the inbound message (assistant replies, etc.)
    const responses = await prisma.message.findMany({
        where: { conversationId, createdAt: { gt: inbound.createdAt } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, direction: true, content: true, from: true, createdAt: true },
    });

    return NextResponse.json({ conversationId, responses });
}
