import { Sidebar, companyAdminItems } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { Locale } from '@/lib/dictionary';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function CompanyLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
}) {
    const { lang } = await params;
    const session = await auth();

    let tags: any[] = [];
    let userStatus: 'ONLINE' | 'BUSY' | 'OFFLINE' = 'OFFLINE';

    if (session?.user?.companyId) {
        try {
            const [fetchedTags, user] = await Promise.all([
                prisma.tag.findMany({
                    where: {
                        companyId: session.user.companyId,
                        showInSidebar: true
                    },
                    orderBy: { name: 'asc' }
                }),
                session.user.id ? prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: { status: true },
                }) : null,
            ]);
            tags = fetchedTags;
            userStatus = (user?.status as typeof userStatus) || 'OFFLINE';

            // Auto-set to ONLINE if currently OFFLINE (user just loaded dashboard)
            if (session.user.id && userStatus === 'OFFLINE') {
                userStatus = 'ONLINE';
                prisma.user.update({
                    where: { id: session.user.id },
                    data: { status: 'ONLINE', lastSeenAt: new Date() },
                }).catch(() => {});
            }
        } catch (e) {
            console.error("Failed to fetch layout data", e);
        }
    }

    return (
        <div className="grid w-full min-h-screen lg:grid-cols-[240px_1fr]">
            <Sidebar role="company" lang={lang} tags={tags} className="hidden lg:block" />
            <div className="flex flex-col min-h-screen">
                <DashboardHeader
                    title="Panel de Empresa"
                    lang={lang}
                    role="company"
                    tags={tags}
                    userStatus={userStatus}
                    userName={session?.user?.name || undefined}
                    userEmail={session?.user?.email || undefined}
                />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:px-10 lg:py-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
