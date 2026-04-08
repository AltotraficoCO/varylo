import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { PipelineBoard } from './pipeline-board';

export default async function PipelinePage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;
    const companyId = session.user.companyId;

    // Seed default stages if none exist
    const stageCount = await prisma.pipelineStage.count({ where: { companyId } });
    if (stageCount === 0) {
        await prisma.pipelineStage.createMany({
            data: [
                { companyId, name: 'Nuevo', color: '#3B82F6', sortOrder: 0 },
                { companyId, name: 'Contactado', color: '#F59E0B', sortOrder: 1 },
                { companyId, name: 'Propuesta', color: '#8B5CF6', sortOrder: 2 },
                { companyId, name: 'Negociación', color: '#F97316', sortOrder: 3 },
                { companyId, name: 'Cerrado', color: '#10B981', sortOrder: 4 },
            ],
        });
    }

    const [stages, contacts, agents, closedDeals] = await Promise.all([
        prisma.pipelineStage.findMany({
            where: { companyId },
            orderBy: { sortOrder: 'asc' },
            include: {
                deals: {
                    where: { status: 'OPEN' },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        contact: { select: { id: true, name: true, phone: true } },
                        assignedTo: { select: { id: true, name: true } },
                        _count: { select: { quotes: true } },
                    },
                },
            },
        }),
        prisma.contact.findMany({
            where: { companyId },
            select: { id: true, name: true, phone: true },
            orderBy: { name: 'asc' },
            take: 200,
        }),
        prisma.user.findMany({
            where: { companyId, active: true },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        }),
        prisma.deal.findMany({
            where: { companyId, status: { in: ['WON', 'LOST'] } },
            include: {
                contact: { select: { id: true, name: true, phone: true } },
                stage: { select: { name: true } },
            },
            orderBy: { closedAt: 'desc' },
            take: 20,
        }),
    ]);

    const serialized = stages.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        deals: s.deals.map(d => ({
            ...d,
            expectedCloseAt: d.expectedCloseAt?.toISOString() || null,
            closedAt: d.closedAt?.toISOString() || null,
            createdAt: d.createdAt.toISOString(),
            updatedAt: d.updatedAt.toISOString(),
        })),
    }));

    const serializedClosed = closedDeals.map(d => ({
        id: d.id,
        title: d.title,
        value: d.value,
        status: d.status,
        closedAt: d.closedAt?.toISOString() || d.updatedAt.toISOString(),
        contactName: d.contact?.name || d.contact?.phone || null,
        stageName: d.stage?.name || null,
    }));

    return (
        <PipelineBoard
            stages={serialized}
            contacts={contacts}
            agents={agents}
            closedDeals={serializedClosed}
            lang={lang}
        />
    );
}
