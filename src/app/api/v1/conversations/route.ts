import { authenticateApiKey, requireScope } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/v1/conversations
 * List conversations, optionally filtered by phone number or status.
 *
 * Query params:
 *   ?phone=573001234567  (filter by contact phone)
 *   ?status=OPEN|RESOLVED (default: all)
 *   ?limit=20            (default 20, max 50)
 *   ?cursor=convId       (pagination)
 */
export async function GET(req: Request) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const scopeError = requireScope(authResult.context, 'messages:read');
    if (scopeError) return scopeError;

    const { companyId } = authResult.context;
    const url = new URL(req.url);

    const phone = url.searchParams.get('phone')?.replace(/[^0-9]/g, '') || null;
    const status = url.searchParams.get('status')?.toUpperCase();
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);
    const cursor = url.searchParams.get('cursor');

    const where: any = { companyId };

    if (phone) {
        where.contact = { phone };
    }
    if (status === 'OPEN' || status === 'RESOLVED') {
        where.status = status;
    }
    if (cursor) {
        where.id = { lt: cursor };
    }

    const conversations = await prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        take: limit + 1,
        select: {
            id: true,
            status: true,
            lastMessageAt: true,
            lastInboundAt: true,
            createdAt: true,
            contact: {
                select: { id: true, name: true, phone: true, email: true },
            },
            channel: {
                select: { id: true, type: true },
            },
            _count: {
                select: { messages: true },
            },
        },
    });

    const hasMore = conversations.length > limit;
    const data = hasMore ? conversations.slice(0, limit) : conversations;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return Response.json({
        success: true,
        conversations: data.map((c) => ({
            id: c.id,
            status: c.status,
            contact: c.contact,
            channel: { id: c.channel.id, type: c.channel.type },
            messageCount: c._count.messages,
            lastMessageAt: c.lastMessageAt,
            lastInboundAt: c.lastInboundAt,
            createdAt: c.createdAt,
        })),
        pagination: {
            limit,
            hasMore,
            nextCursor,
        },
    });
}
