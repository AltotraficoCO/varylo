import { authenticateApiKey, requireScope } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/v1/conversations/:conversationId/messages
 * Get message history for a conversation.
 *
 * Query params:
 *   ?limit=50       (default 50, max 100)
 *   ?cursor=msgId   (pagination: messages before this ID)
 *   ?order=asc|desc (default asc)
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const scopeError = requireScope(authResult.context, 'messages:read');
    if (scopeError) return scopeError;

    const { companyId } = authResult.context;
    const { conversationId } = await params;

    // Verify conversation belongs to this company
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, companyId },
        select: {
            id: true,
            status: true,
            createdAt: true,
            contact: {
                select: { id: true, name: true, phone: true },
            },
            channel: {
                select: { id: true, type: true },
            },
        },
    });

    if (!conversation) {
        return Response.json(
            { success: false, error: 'Conversation not found.' },
            { status: 404 }
        );
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100);
    const cursor = url.searchParams.get('cursor');
    const order = url.searchParams.get('order') === 'desc' ? 'desc' as const : 'asc' as const;

    const where: any = { conversationId, companyId };
    if (cursor) {
        where.id = order === 'asc' ? { gt: cursor } : { lt: cursor };
    }

    const messages = await prisma.message.findMany({
        where,
        orderBy: { timestamp: order },
        take: limit + 1, // fetch one extra to check if there are more
        select: {
            id: true,
            direction: true,
            from: true,
            to: true,
            content: true,
            providerMessageId: true,
            timestamp: true,
            mediaUrl: true,
            mediaType: true,
            mimeType: true,
            fileName: true,
        },
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return Response.json({
        success: true,
        conversation: {
            id: conversation.id,
            status: conversation.status,
            contact: conversation.contact,
            channel: { id: conversation.channel.id, type: conversation.channel.type },
            createdAt: conversation.createdAt,
        },
        messages: data,
        pagination: {
            limit,
            hasMore,
            nextCursor,
        },
    });
}
