import { authenticateApiKey } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';

/**
 * GET /api/v1/auth
 * Validate API key and return account info + WhatsApp connection status.
 */
export async function GET(req: Request) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const { companyId } = authResult.context;

    const [company, whatsappChannel] = await Promise.all([
        prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true, name: true, status: true, plan: true },
        }),
        prisma.channel.findFirst({
            where: { companyId, type: ChannelType.WHATSAPP },
            select: { id: true, status: true, configJson: true },
        }),
    ]);

    const waConfig = whatsappChannel?.configJson as {
        phoneNumberId?: string;
        wabaId?: string;
        phoneDisplay?: string;
    } | null;

    return Response.json({
        success: true,
        company: {
            id: company?.id,
            name: company?.name,
            status: company?.status,
            plan: company?.plan,
        },
        whatsapp: {
            connected: whatsappChannel?.status === 'CONNECTED',
            phoneNumberId: waConfig?.phoneNumberId || null,
            phoneDisplay: waConfig?.phoneDisplay || null,
        },
    });
}
