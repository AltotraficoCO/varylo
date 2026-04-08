import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CalendarClient } from './calendar-client';

export default async function CalendarPage() {
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const company = await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { googleCalendarRefreshToken: true },
    });

    return <CalendarClient isConnected={!!company?.googleCalendarRefreshToken} />;
}
