import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { Locale } from '@/lib/dictionary';

export default async function DashboardPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const session = await auth();

    if (!session || !session.user) {
        redirect(`/${lang}/login`);
    }

    const role = session.user.role;

    if (role === Role.SUPER_ADMIN) {
        redirect(`/${lang}/super-admin`);
    } else if (role === Role.COMPANY_ADMIN || role === Role.SUPERVISOR) {
        redirect(`/${lang}/company`);
    } else if (role === Role.AGENT) {
        // Checking if agent has sub-route, typically it was just /agent based on folder structure
        redirect(`/${lang}/agent`);
    } else {
        // Fallback or unknown role
        redirect(`/${lang}`);
    }
}
