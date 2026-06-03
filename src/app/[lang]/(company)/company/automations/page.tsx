import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AutomationsList } from './automations-list';

export default async function AutomationsPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const flows = await prisma.automationFlow.findMany({
        where: { companyId: session.user.companyId },
        orderBy: { updatedAt: 'desc' },
        select: {
            id: true, name: true, status: true, updatedAt: true,
            _count: { select: { runs: true } },
        },
    });

    return (
        <AutomationsList
            lang={lang}
            flows={flows.map(f => ({
                id: f.id, name: f.name, status: f.status,
                runs: f._count.runs,
                updatedAt: f.updatedAt.toISOString(),
            }))}
        />
    );
}
