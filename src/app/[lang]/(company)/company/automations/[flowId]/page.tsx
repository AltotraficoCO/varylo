import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { ChannelType } from '@prisma/client';
import { AutomationFlowEditor } from './automation-flow-editor';
import type { AutomationGraph } from '@/types/automation';

export default async function AutomationFlowPage({ params }: { params: Promise<{ flowId: string; lang: string }> }) {
    const { flowId, lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;
    const companyId = session.user.companyId;

    const [flow, agents, channels] = await Promise.all([
        prisma.automationFlow.findUnique({ where: { id: flowId, companyId } }),
        prisma.aiAgent.findMany({ where: { companyId, active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        prisma.channel.findMany({ where: { companyId, type: ChannelType.WHATSAPP }, select: { id: true, configJson: true } }),
    ]);

    if (!flow) notFound();

    const channelOpts = channels.map(c => {
        const cfg = c.configJson as { label?: string; phoneNumberId?: string } | null;
        return { id: c.id, label: cfg?.label || cfg?.phoneNumberId || 'WhatsApp' };
    });

    return (
        <div className="-m-6">
            <AutomationFlowEditor
                flowId={flow.id}
                initialGraph={flow.graphJson as unknown as AutomationGraph}
                initialStatus={flow.status}
                secret={flow.webhookSecret}
                agents={agents}
                channels={channelOpts}
                backHref={`/${lang}/company/automations`}
            />
        </div>
    );
}
