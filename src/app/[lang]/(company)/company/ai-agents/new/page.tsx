import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NewAgentFlow } from './new-agent-flow';

export default async function NewAgentPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const [channels, company, ecommerceIntegration] = await Promise.all([
        prisma.channel.findMany({
            where: { companyId: session.user.companyId },
            select: { id: true, type: true },
        }),
        prisma.company.findUnique({
            where: { id: session.user.companyId },
            select: { googleCalendarRefreshToken: true },
        }),
        prisma.ecommerceIntegration.findFirst({
            where: { companyId: session.user.companyId, active: true },
            select: { id: true },
        }),
    ]);

    return (
        <NewAgentFlow
            lang={lang}
            channels={channels.map(c => ({ id: c.id, type: c.type }))}
            hasGoogleCalendar={!!company?.googleCalendarRefreshToken}
            hasEcommerce={!!ecommerceIntegration}
        />
    );
}
