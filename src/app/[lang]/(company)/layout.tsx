import { Sidebar, companyAdminItems } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { getDictionary, Locale } from '@/lib/dictionary';
import { DictionaryProvider } from '@/lib/i18n-context';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default async function CompanyLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
}) {
    const { lang } = await params;
    const session = await auth();
    const dict = await getDictionary(lang as Locale);

    let tags: any[] = [];
    let userStatus: 'ONLINE' | 'BUSY' | 'OFFLINE' = 'OFFLINE';
    let subscriptionExpired = false;

    if (session?.user?.companyId) {
        try {
            const [fetchedTags, user, activeSub] = await Promise.all([
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
                prisma.subscription.findFirst({
                    where: { companyId: session.user.companyId, status: { in: ['ACTIVE', 'TRIAL'] } },
                    select: { currentPeriodEnd: true },
                }),
            ]);
            tags = fetchedTags;
            userStatus = (user?.status as typeof userStatus) || 'OFFLINE';

            // Check if subscription is expired
            if (activeSub && activeSub.currentPeriodEnd < new Date()) {
                subscriptionExpired = true;
            }
            // No active subscription at all (CANCELLED or none)
            if (!activeSub) {
                const anySub = await prisma.subscription.findFirst({
                    where: { companyId: session.user.companyId },
                    select: { id: true },
                });
                if (anySub) subscriptionExpired = true;
            }

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
        <DictionaryProvider dictionary={dict}>
            <div className="grid w-full min-h-screen lg:grid-cols-[240px_1fr]">
                <Sidebar role="company" lang={lang} tags={tags} className="hidden lg:block" dict={dict.dashboard.sidebar} />
                <div className="flex flex-col min-h-screen min-w-0">
                    <DashboardHeader
                        title={dict.dashboard.companyTitle}
                        lang={lang}
                        role="company"
                        tags={tags}
                        userStatus={userStatus}
                        userName={session?.user?.name || undefined}
                        userEmail={session?.user?.email || undefined}
                        dict={dict.dashboard}
                        sidebarDict={dict.dashboard.sidebar}
                    />
                    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:px-10 lg:py-8 min-w-0 overflow-x-hidden">
                        {children}
                    </main>
                </div>
            </div>
        </DictionaryProvider>
    );
}
