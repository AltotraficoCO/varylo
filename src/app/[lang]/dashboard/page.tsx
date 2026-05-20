import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Locale } from '@/lib/dictionary';

// Compare against raw strings (not the Prisma `Role` enum) so a JWT carrying a
// role unknown to the currently-loaded Prisma client doesn't silently fall
// through and render a blank page.
export default async function DashboardPage({ params }: { params: Promise<{ lang: Locale }> }) {
    const { lang } = await params;
    const session = await auth();

    if (!session || !session.user) {
        redirect(`/${lang}/login`);
    }

    const role = session.user.role as string | undefined;
    console.log('[dashboard-redirect] role=', role, 'lang=', lang);

    if (role === 'SUPER_ADMIN') {
        redirect(`/${lang}/super-admin`);
    }
    if (role === 'COMPANY_ADMIN' || role === 'SUPERVISOR') {
        redirect(`/${lang}/company`);
    }
    if (role === 'AGENT') {
        redirect(`/${lang}/agent`);
    }
    redirect(`/${lang}/login`);
}
