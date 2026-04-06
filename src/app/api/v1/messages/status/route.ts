import { authenticateApiKey, requireScope } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/v1/messages/status?messageId=xxx
 * Check delivery/read status of a sent message.
 *
 * Note: Status is only available if the WhatsApp webhook has processed
 * status updates for this message. Returns the latest known status.
 */
export async function GET(req: Request) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const scopeError = requireScope(authResult.context, 'messages:read');
    if (scopeError) return scopeError;

    const { companyId } = authResult.context;

    const url = new URL(req.url);
    const messageId = url.searchParams.get('messageId');

    if (!messageId) {
        return Response.json(
            { success: false, error: 'Query param "messageId" is required.' },
            { status: 400 }
        );
    }

    // Look up by internal ID or providerMessageId
    const message = await prisma.message.findFirst({
        where: {
            companyId,
            OR: [
                { id: messageId },
                { providerMessageId: messageId },
            ],
        },
        select: {
            id: true,
            providerMessageId: true,
            direction: true,
            content: true,
            timestamp: true,
            from: true,
            to: true,
            mediaType: true,
        },
    });

    if (!message) {
        return Response.json(
            { success: false, error: 'Message not found.' },
            { status: 404 }
        );
    }

    // For now, we return the message info.
    // Delivery/read status tracking requires the WhatsApp webhook to store statuses.
    // We'll check if there's a status log for this message.
    let deliveryStatus = 'sent';

    if (message.providerMessageId) {
        // Check MessageStatus table if it exists, otherwise return 'sent'
        try {
            const statusLog = await (prisma as any).messageStatus?.findFirst({
                where: { providerMessageId: message.providerMessageId },
                orderBy: { createdAt: 'desc' },
            });
            if (statusLog) {
                deliveryStatus = statusLog.status;
            }
        } catch {
            // MessageStatus table may not exist yet - that's fine
        }
    }

    return Response.json({
        success: true,
        message: {
            id: message.id,
            providerMessageId: message.providerMessageId,
            direction: message.direction,
            from: message.from,
            to: message.to,
            content: message.content,
            mediaType: message.mediaType,
            timestamp: message.timestamp,
            status: deliveryStatus,
        },
    });
}
