import { authenticateApiKey } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';

/**
 * GET /api/v1/status
 * Verify WhatsApp connection is active by pinging Meta API.
 */
export async function GET(req: Request) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const { companyId } = authResult.context;

    const channel = await prisma.channel.findFirst({
        where: { companyId, type: ChannelType.WHATSAPP, status: 'CONNECTED' },
        select: { configJson: true },
    });

    if (!channel?.configJson) {
        return Response.json({
            success: true,
            connected: false,
            reason: 'No WhatsApp channel configured.',
        });
    }

    const config = channel.configJson as {
        phoneNumberId?: string;
        accessToken?: string;
        phoneDisplay?: string;
    };

    if (!config.phoneNumberId || !config.accessToken) {
        return Response.json({
            success: true,
            connected: false,
            reason: 'WhatsApp credentials are incomplete.',
        });
    }

    // Ping Meta API to verify the token is still valid
    try {
        const res = await fetch(
            `https://graph.facebook.com/v21.0/${config.phoneNumberId}`,
            {
                headers: { Authorization: `Bearer ${config.accessToken}` },
                cache: 'no-store',
            }
        );

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return Response.json({
                success: true,
                connected: false,
                reason: (data as any)?.error?.message || `Meta API returned ${res.status}`,
            });
        }

        return Response.json({
            success: true,
            connected: true,
            phoneDisplay: config.phoneDisplay || null,
        });
    } catch {
        return Response.json({
            success: true,
            connected: false,
            reason: 'Could not reach Meta API.',
        });
    }
}
