import { authenticateApiKey, requireScope } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { ChannelType } from '@prisma/client';

/**
 * GET /api/v1/templates
 * List approved WhatsApp templates.
 * Query params: ?status=APPROVED|ALL (default APPROVED)
 */
export async function GET(req: Request) {
    const authResult = await authenticateApiKey(req);
    if ('error' in authResult) return authResult.error;

    const scopeError = requireScope(authResult.context, 'templates:read');
    if (scopeError) return scopeError;

    const { companyId } = authResult.context;

    const channel = await prisma.channel.findFirst({
        where: { companyId, type: ChannelType.WHATSAPP, status: 'CONNECTED' },
        select: { configJson: true },
    });

    if (!channel?.configJson) {
        return Response.json(
            { success: false, error: 'No WhatsApp channel configured.' },
            { status: 400 }
        );
    }

    const config = channel.configJson as {
        accessToken?: string;
        wabaId?: string;
    };

    if (!config.accessToken || !config.wabaId) {
        return Response.json(
            { success: false, error: 'Missing WABA ID or Access Token in channel config.' },
            { status: 400 }
        );
    }

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status')?.toUpperCase() || 'APPROVED';

    try {
        const res = await fetch(
            `https://graph.facebook.com/v18.0/${config.wabaId}/message_templates?limit=100`,
            {
                headers: { Authorization: `Bearer ${config.accessToken}` },
                cache: 'no-store',
            }
        );

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const msg = (data as any)?.error?.message || `HTTP ${res.status}`;
            return Response.json(
                { success: false, error: `Meta API error: ${msg}` },
                { status: 502 }
            );
        }

        const data = await res.json();
        let templates = data.data || [];

        if (statusFilter === 'APPROVED') {
            templates = templates.filter((t: any) => t.status === 'APPROVED');
        }

        return Response.json({
            success: true,
            templates: templates.map((t: any) => ({
                name: t.name,
                language: t.language,
                status: t.status,
                category: t.category,
                components: t.components,
            })),
        });
    } catch {
        return Response.json(
            { success: false, error: 'Failed to fetch templates from Meta.' },
            { status: 502 }
        );
    }
}
