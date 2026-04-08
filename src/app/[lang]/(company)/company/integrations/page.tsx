import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { IntegrationsClient } from './integrations-client';

export default async function IntegrationsPage() {
    const session = await auth();
    if (!session?.user?.companyId) return null;
    const companyId = session.user.companyId;

    let n8nWebhooks: any[] = [];
    try { n8nWebhooks = await prisma.webhookIntegration.findMany({ where: { companyId }, select: { id: true, name: true, platform: true, webhookUrl: true, events: true, active: true, lastUsedAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); } catch { n8nWebhooks = []; }

    const [company, ecommerceStores] = await Promise.all([
        prisma.company.findUnique({
            where: { id: companyId },
            select: {
                openaiApiKey: true,
                openaiApiKeyUpdatedAt: true,
                googleCalendarRefreshToken: true,
                googleCalendarEmail: true,
                googleCalendarConnectedAt: true,
            },
        }),
        prisma.ecommerceIntegration.findMany({
            where: { companyId },
            select: { id: true, name: true, platform: true, storeUrl: true, active: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    return (
        <IntegrationsClient
            openai={{
                hasApiKey: !!company?.openaiApiKey,
                updatedAt: company?.openaiApiKeyUpdatedAt?.toISOString() || null,
            }}
            googleCalendar={{
                isConnected: !!company?.googleCalendarRefreshToken,
                email: company?.googleCalendarEmail || null,
                connectedAt: company?.googleCalendarConnectedAt?.toISOString() || null,
            }}
            ecommerceStores={ecommerceStores.map(s => ({
                ...s,
                createdAt: s.createdAt.toISOString(),
            }))}
            n8nIntegrations={n8nWebhooks.filter((w: any) => w.platform === 'n8n').map((w: any) => ({
                ...w,
                lastUsedAt: w.lastUsedAt?.toISOString() || null,
                createdAt: w.createdAt.toISOString(),
            }))}
        />
    );
}
