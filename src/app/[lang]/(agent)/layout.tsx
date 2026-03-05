import { Sidebar, agentItems } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { Locale } from '@/lib/dictionary';
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
        <div className="grid min-h-screen w-full lg:grid-cols-[240px_1fr]">
            <Sidebar role="agent" lang={lang} className="hidden lg:block" />
            <div className="flex flex-col min-h-screen">
                <DashboardHeader
                    title="Panel de Agente"
                    lang={lang}
                    role="agent"
                    userStatus={userStatus}
                    userName={session?.user?.name || undefined}
                    userEmail={session?.user?.email || undefined}
                />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
