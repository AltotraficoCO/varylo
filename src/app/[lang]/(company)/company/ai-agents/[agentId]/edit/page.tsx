import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { EditAgentFlow } from './edit-agent-flow';
import { redirect } from 'next/navigation';

export default async function EditAgentPage({ params }: { params: Promise<{ lang: string; agentId: string }> }) {
    const { lang, agentId } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const [agent, channels, company, ecommerceStores] = await Promise.all([
        prisma.aiAgent.findUnique({
            where: { id: agentId, companyId: session.user.companyId },
            include: { channels: { select: { id: true } } },
        }),
        prisma.channel.findMany({
            where: { companyId: session.user.companyId },
            select: { id: true, type: true },
        }),
        prisma.company.findUnique({
            where: { id: session.user.companyId },
            select: { googleCalendarRefreshToken: true },
        }),
        prisma.ecommerceIntegration.findMany({
            where: { companyId: session.user.companyId, active: true },
            select: { platform: true },
        }),
    ]);

    if (!agent) redirect(`/${lang}/company/ai-agents`);

    return (
        <EditAgentFlow
            lang={lang}
            agent={{
                id: agent.id,
                name: agent.name,
                agentType: agent.agentType,
                systemPrompt: agent.systemPrompt,
                contextInfo: agent.contextInfo || '',
                model: agent.model,
                temperature: agent.temperature,
                transferKeywords: agent.transferKeywords.join(', '),
                dataCaptureEnabled: agent.dataCaptureEnabled,
                captureFields: agent.captureFields as any[] | null,
                calendarEnabled: agent.calendarEnabled,
                ecommerceEnabled: agent.ecommerceEnabled,
                crmEnabled: agent.crmEnabled,
                webhookConfigJson: agent.webhookConfigJson as any,
                channelIds: agent.channels.map(c => c.id),
            }}
            channels={channels.map(c => ({ id: c.id, type: c.type }))}
            hasGoogleCalendar={!!company?.googleCalendarRefreshToken}
            hasShopify={ecommerceStores.some(s => s.platform === 'shopify')}
            hasWooCommerce={ecommerceStores.some(s => s.platform === 'woocommerce')}
        />
    );
}
