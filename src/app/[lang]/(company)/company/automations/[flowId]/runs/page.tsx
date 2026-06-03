import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { RunsView } from './runs-view';
import type { AutomationGraph } from '@/types/automation';

export default async function AutomationRunsPage({ params }: { params: Promise<{ flowId: string; lang: string }> }) {
    const { flowId, lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;
    const companyId = session.user.companyId;

    const flow = await prisma.automationFlow.findUnique({ where: { id: flowId, companyId } });
    if (!flow) notFound();

    const [runs, agents] = await Promise.all([
        prisma.automationRun.findMany({
            where: { flowId, companyId },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: { id: true, status: true, error: true, path: true, payload: true, createdAt: true },
        }),
        prisma.aiAgent.findMany({ where: { companyId }, select: { id: true, name: true } }),
    ]);

    // Map node id -> human label, from the flow graph
    const graph = flow.graphJson as unknown as AutomationGraph;
    const agentName = (id?: string) => agents.find(a => a.id === id)?.name || 'Agente';
    const nodeLabels: Record<string, string> = {};
    Object.values(graph?.nodes || {}).forEach(n => {
        nodeLabels[n.id] =
            n.type === 'trigger' ? 'Webhook'
            : n.type === 'condition' ? `Condición (${n.field || '—'})`
            : `Agente: ${agentName(n.agentId)}`;
    });

    return (
        <RunsView
            flowName={flow.name}
            backHref={`/${lang}/company/automations/${flowId}`}
            nodeLabels={nodeLabels}
            runs={runs.map(r => ({
                id: r.id,
                status: r.status,
                error: r.error,
                path: Array.isArray(r.path) ? (r.path as string[]) : [],
                payload: r.payload,
                createdAt: r.createdAt.toISOString(),
            }))}
        />
    );
}
