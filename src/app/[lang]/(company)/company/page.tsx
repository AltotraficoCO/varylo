import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { CreditCard, ArrowRight } from 'lucide-react';
import { ContactAvatar } from '@/components/contact-avatar';

export default async function CompanyDashboard({
    params,
}: {
    params: Promise<{ lang: string }>;
}) {
    const { lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const companyId = session.user.companyId;

    const [
        openConversations,
        unassignedConversations,
        onlineAgents,
        totalAgents,
        recentConversations,
        hasSubscription,
    ] = await Promise.all([
        prisma.conversation.count({ where: { companyId, status: 'OPEN' } }),
        prisma.conversation.count({ where: { companyId, status: 'OPEN', assignedAgents: { none: {} } } }),
        prisma.user.count({ where: { companyId, role: Role.AGENT, status: 'ONLINE' } }),
        prisma.user.count({ where: { companyId, role: { in: [Role.AGENT, Role.COMPANY_ADMIN] } } }),
        prisma.conversation.findMany({
            where: { companyId },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: {
                contact: true,
                channel: true,
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        }),
        prisma.subscription.findFirst({
            where: { companyId, status: { in: ['ACTIVE', 'TRIAL'] } },
            select: { id: true },
        }).catch(() => null),
    ]);

    const channelBadgeColor: Record<string, string> = {
        WHATSAPP: 'bg-[#ECFDF5] text-[#10B981]',
        INSTAGRAM: 'bg-[#FDF2F8] text-[#EC4899]',
        WEB_CHAT: 'bg-[#EFF6FF] text-[#3B82F6]',
    };

    const channelLabel: Record<string, string> = {
        WHATSAPP: 'WhatsApp',
        INSTAGRAM: 'Instagram',
        WEB_CHAT: 'Web Chat',
    };

    function timeAgo(date: Date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'hace un momento';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `hace ${days}d`;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-[28px] font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Resumen general de tu empresa</p>
            </div>

            {/* Subscription Alert */}
            {!hasSubscription && (
                <Link href={`/${lang}/company/settings?tab=billing`}>
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="p-3 rounded-lg bg-amber-100">
                            <CreditCard className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-amber-900">Activa tu suscripción</p>
                            <p className="text-sm text-amber-700">Agrega un método de pago y selecciona un plan para desbloquear todas las funciones.</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-amber-600 shrink-0" />
                    </div>
                </Link>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Conversaciones abiertas"
                    value={openConversations}
                    change="+12% vs ayer"
                    changeColor="text-[#10B981]"
                />
                <StatCard
                    label="Pendientes"
                    value={unassignedConversations}
                    change={unassignedConversations > 0 ? `${unassignedConversations} sin asignar` : 'Todas asignadas'}
                    changeColor="text-[#EF4444]"
                />
                <StatCard
                    label="Agentes en línea"
                    value={onlineAgents}
                    change={`de ${totalAgents} activos`}
                    changeColor="text-[#71717A]"
                />
                <StatCard
                    label="Tiempo promedio resp."
                    value="2.4m"
                    change="-18% vs semana pasada"
                    changeColor="text-[#10B981]"
                />
            </div>

            {/* Recent Conversations */}
            <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">Conversaciones recientes</h2>
                <div className="bg-card rounded-xl border overflow-hidden">
                    {recentConversations.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                            No hay conversaciones aún
                        </div>
                    ) : (
                        <div className="divide-y divide-[#F4F4F5]">
                            {recentConversations.map((conv) => {
                                const lastMsg = conv.messages[0];
                                const channelType = conv.channel?.type || 'WEB_CHAT';
                                return (
                                    <Link
                                        key={conv.id}
                                        href={`/${lang}/company/conversations?id=${conv.id}`}
                                        className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
                                    >
                                        <ContactAvatar
                                            name={conv.contact?.name || 'Sin nombre'}
                                            className="h-10 w-10"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {conv.contact?.name || 'Sin nombre'}
                                            </p>
                                            <p className="text-[13px] text-muted-foreground truncate">
                                                {lastMsg?.content || 'Sin mensajes'}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${channelBadgeColor[channelType] || 'bg-muted text-muted-foreground'}`}>
                                            {channelLabel[channelType] || channelType}
                                        </span>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {timeAgo(conv.updatedAt)}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, change, changeColor }: {
    label: string;
    value: string | number;
    change: string;
    changeColor: string;
}) {
    return (
        <div className="bg-card rounded-xl border p-5 space-y-2.5">
            <p className="text-[13px] text-[#71717A]">{label}</p>
            <p className="text-[32px] font-bold text-[#09090B]">{value}</p>
            {change && (
                <p className={`text-xs ${changeColor}`}>{change}</p>
            )}
        </div>
    );
}
