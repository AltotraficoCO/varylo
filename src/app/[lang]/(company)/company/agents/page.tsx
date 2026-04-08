import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { CreateAgentDialog } from './create-agent-dialog';
import { ContactAvatar } from '@/components/contact-avatar';
import { getDictionary, Locale } from '@/lib/dictionary';

export default async function AgentsPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const dict = await getDictionary(lang as Locale);
    const t = dict.dashboard.agents;
    const tc = dict.dashboard.common;
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const agents = await prisma.user.findMany({
        where: {
            companyId: session.user.companyId,
            role: 'AGENT',
            NOT: { id: session.user.id }
        },
        include: {
            _count: { select: { assignedConversations: { where: { status: 'OPEN' } } } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const roleLabel: Record<string, string> = {
        COMPANY_ADMIN: 'Admin',
        AGENT: t.role,
    };

    const roleBadgeClass: Record<string, string> = {
        COMPANY_ADMIN: 'bg-[#F5F3FF] text-[#8B5CF6]',
        AGENT: 'bg-[#EFF6FF] text-[#3B82F6]',
    };

    const statusDotColor: Record<string, string> = {
        ONLINE: 'bg-[#22C55E]',
        BUSY: 'bg-[#F59E0B]',
        OFFLINE: 'bg-[#A1A1AA]',
    };

    const statusTextClass: Record<string, string> = {
        ONLINE: 'text-[#16A34A]',
        BUSY: 'text-[#D97706]',
        OFFLINE: 'text-[#71717A]',
    };

    const statusLabel: Record<string, string> = {
        ONLINE: tc.online,
        BUSY: tc.busy,
        OFFLINE: tc.offline,
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#09090B]">{t.title}</h1>
                    <p className="text-sm text-[#71717A] mt-1">{t.subtitle}</p>
                </div>
                <CreateAgentDialog />
            </div>

            <div className="bg-white rounded-xl border border-[#E4E4E7] overflow-hidden">
                <div className="flex items-center py-3 px-5 bg-[#F4F4F5] rounded-t-xl">
                    <div className="flex-1 text-xs font-semibold text-[#71717A] tracking-[0.3px]">Nombre</div>
                    <div className="flex-1 text-xs font-semibold text-[#71717A] tracking-[0.3px]">Email</div>
                    <div className="w-[100px] text-xs font-semibold text-[#71717A] tracking-[0.3px]">Rol</div>
                    <div className="w-[120px] text-xs font-semibold text-[#71717A] tracking-[0.3px]">Estado</div>
                    <div className="w-[100px] text-xs font-semibold text-[#71717A] tracking-[0.3px]">{t.openConv}</div>
                </div>

                {agents.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[#71717A]">
                        {t.noAgents}
                    </div>
                ) : (
                    <div>
                        {agents.map((agent) => {
                            const openConvs = agent._count.assignedConversations;
                            return (
                                <div key={agent.id} className="flex items-center py-3.5 px-5 border-t border-[#F4F4F5]">
                                    <div className="flex-1 flex items-center gap-3">
                                        <ContactAvatar name={agent.name || 'Agent'} className="h-9 w-9" />
                                        <span className="text-sm font-medium text-[#09090B] truncate">{agent.name}</span>
                                    </div>
                                    <div className="flex-1 text-sm text-[#3F3F46] truncate">{agent.email}</div>
                                    <div className="w-[100px]">
                                        <span className={`inline-block rounded-xl px-2.5 py-1 text-xs font-medium ${roleBadgeClass[agent.role] || roleBadgeClass.AGENT}`}>
                                            {roleLabel[agent.role] || agent.role}
                                        </span>
                                    </div>
                                    <div className="w-[120px] flex items-center gap-1.5">
                                        <span className={`h-2 w-2 rounded-full ${statusDotColor[agent.status] || 'bg-[#A1A1AA]'}`} />
                                        <span className={`text-[13px] ${statusTextClass[agent.status] || 'text-[#71717A]'}`}>
                                            {statusLabel[agent.status] || agent.status}
                                        </span>
                                    </div>
                                    <div className={`w-[100px] text-sm font-medium ${openConvs > 0 ? 'text-[#09090B]' : 'text-[#71717A]'}`}>
                                        {openConvs}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
