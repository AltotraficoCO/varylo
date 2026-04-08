import { Sidebar, agentItems } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { getDictionary, Locale } from '@/lib/dictionary';
import { DictionaryProvider } from '@/lib/i18n-context';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function AgentLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
}) {
    const { lang } = await params;
    const session = await auth();
    const dict = await getDictionary(lang as Locale);

    let userStatus: 'ONLINE' | 'BUSY' | 'OFFLINE' = 'OFFLINE';

    if (session?.user?.id) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { status: true },
            });
            userStatus = (user?.status as typeof userStatus) || 'OFFLINE';

            // Auto-set to ONLINE if currently OFFLINE
            if (userStatus === 'OFFLINE') {
                userStatus = 'ONLINE';
                prisma.user.update({
                    where: { id: session.user.id },
                    data: { status: 'ONLINE', lastSeenAt: new Date() },
                }).catch(() => {});
            }
        } catch (e) {
            console.error("Failed to fetch agent status", e);
        }
    }

    return (
        <DictionaryProvider dictionary={dict}>
            <div className="grid min-h-screen w-full lg:grid-cols-[240px_1fr]">
                <Sidebar role="agent" lang={lang} className="hidden lg:block" dict={dict.dashboard.sidebar} />
                <div className="flex flex-col min-h-screen">
                    <DashboardHeader
                        title={dict.dashboard.agentTitle}
                        lang={lang}
                        role="agent"
                        userStatus={userStatus}
                        userName={session?.user?.name || undefined}
                        userEmail={session?.user?.email || undefined}
                        dict={dict.dashboard}
                        sidebarDict={dict.dashboard.sidebar}
                    />
                    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </DictionaryProvider>
    );
}
