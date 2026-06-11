import { Sidebar, agentItems } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { getDictionary, Locale } from '@/lib/dictionary';
import { DictionaryProvider } from '@/lib/i18n-context';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { StatusBanner } from '@/components/status-banner';
import { PresenceHeartbeat } from '@/components/presence-heartbeat';

const AGENT_ALLOWED_ROLES = new Set(['AGENT', 'COMPANY_ADMIN', 'SUPER_ADMIN']);

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

    if (!session?.user) {
        redirect(`/${lang}/login`);
    }

    const role = (session.user.role as string | undefined) ?? null;
    if (role === 'SUPERVISOR') {
        redirect(`/${lang}/company`);
    }
    if (!role || !AGENT_ALLOWED_ROLES.has(role)) {
        redirect(`/${lang}/dashboard`);
    }

    let userStatus: 'ONLINE' | 'BUSY' | 'OFFLINE' = 'OFFLINE';
    let channelInboxes: { id: string; label: string }[] = [];
    let tags: { id: string; name: string; color: string; showInSidebar: boolean }[] = [];

    if (session?.user?.id) {
        try {
            const [user, waChannels, fetchedTags] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: { status: true },
                }),
                session.user.companyId ? prisma.channel.findMany({
                    where: { companyId: session.user.companyId, type: 'WHATSAPP', status: 'CONNECTED' },
                    orderBy: { createdAt: 'asc' },
                    select: { id: true, configJson: true },
                }) : Promise.resolve([]),
                session.user.companyId ? prisma.tag.findMany({
                    where: { companyId: session.user.companyId, showInSidebar: true },
                    orderBy: { name: 'asc' },
                }) : Promise.resolve([]),
            ]);
            userStatus = (user?.status as typeof userStatus) || 'OFFLINE';

            // WhatsApp numbers for the per-number inbox entries in the sidebar.
            channelInboxes = waChannels.map((ch) => {
                const cfg = (ch.configJson || {}) as { label?: string; phoneDisplay?: string };
                return { id: ch.id, label: cfg.label?.trim() || cfg.phoneDisplay || 'WhatsApp' };
            });
            tags = fetchedTags;

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
            <PresenceHeartbeat />
            <div className="flex w-full h-screen overflow-hidden">
                <div className="hidden lg:block shrink-0">
                    <Sidebar role="agent" lang={lang} channels={channelInboxes} tags={tags} dict={dict.dashboard.sidebar} />
                </div>
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                    <StatusBanner />
                    <DashboardHeader
                        title={dict.dashboard.agentTitle}
                        lang={lang}
                        role="agent"
                        channels={channelInboxes}
                        tags={tags}
                        userStatus={userStatus}
                        userName={session?.user?.name || undefined}
                        userEmail={session?.user?.email || undefined}
                        dict={dict.dashboard}
                        sidebarDict={dict.dashboard.sidebar}
                    />
                    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 min-w-0 overflow-x-hidden">
                        {children}
                    </main>
                </div>
            </div>
        </DictionaryProvider>
    );
}
