import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DeleteAiAgentDialog } from './delete-ai-agent-dialog';
import { AiAgentStatusToggle } from './ai-agent-status-toggle';
import { AGENT_TYPE_CONFIGS } from '@/lib/ai-agent-types';
import type { AiAgentType } from '@/lib/ai-agent-types';
import { Sparkles, Bot, Plus, Pencil } from 'lucide-react';
import Link from 'next/link';

// Rotating color palette for agent icon backgrounds
const ICON_COLORS = [
    { bg: '#F5F3FF', icon: '#8B5CF6' }, // purple
    { bg: '#EFF6FF', icon: '#3B82F6' }, // blue
    { bg: '#ECFDF5', icon: '#10B981' }, // green
    { bg: '#FFF7ED', icon: '#F97316' }, // orange
    { bg: '#FEF2F2', icon: '#EF4444' }, // red
    { bg: '#FFFBEB', icon: '#F59E0B' }, // amber
];

export default async function AiAgentsPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const [aiAgents, channels, company, ecommerceIntegration] = await Promise.all([
        prisma.aiAgent.findMany({
            where: { companyId: session.user.companyId },
            include: {
                channels: true,
                _count: { select: { conversations: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.channel.findMany({
            where: { companyId: session.user.companyId },
        }),
        prisma.company.findUnique({
            where: { id: session.user.companyId },
            select: { googleCalendarRefreshToken: true },
        }),
        prisma.ecommerceIntegration.findFirst({
            where: { companyId: session.user.companyId },
            select: { active: true },
        }),
    ]);

    const hasGoogleCalendar = !!company?.googleCalendarRefreshToken;
    const hasEcommerce = !!ecommerceIntegration?.active;

    const channelLabel: Record<string, string> = {
        WHATSAPP: 'WhatsApp',
        INSTAGRAM: 'Instagram',
        WEB_CHAT: 'Web Chat',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: '#09090B' }}>Agentes IA</h1>
                    <p className="text-sm mt-1" style={{ color: '#71717A' }}>Configura agentes inteligentes que responden por ti</p>
                </div>
                <Link
                    href={`/${lang}/company/ai-agents/new`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2.5 text-[14px] font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo agente
                </Link>
            </div>

            {/* Card Grid */}
            <div className="grid gap-5 md:grid-cols-2">
                {aiAgents.length === 0 ? (
                    <div className="col-span-2 rounded-xl border p-12 flex flex-col items-center justify-center gap-3 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#E4E4E7' }}>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#F4F4F5' }}>
                            <Sparkles className="h-6 w-6" style={{ color: '#71717A' }} />
                        </div>
                        <h3 className="font-semibold" style={{ color: '#09090B' }}>No hay agentes IA configurados</h3>
                        <p className="text-sm" style={{ color: '#71717A' }}>Crea uno nuevo para empezar a automatizar tus respuestas.</p>
                    </div>
                ) : (
                    aiAgents.map((agent, index) => {
                        const typeConfig = AGENT_TYPE_CONFIGS[agent.agentType as AiAgentType] || AGENT_TYPE_CONFIGS.CUSTOM;
                        const colorScheme = ICON_COLORS[index % ICON_COLORS.length];
                        const channelNames = agent.channels.map(ch => channelLabel[ch.type] || ch.type);
                        const statsText = [
                            channelNames.length > 0 ? channelNames.join(', ') : 'Sin canales',
                            `${agent._count.conversations} conversaciones`,
                        ].join(' \u2022 ');

                        return (
                            <div
                                key={agent.id}
                                className="rounded-xl flex flex-col gap-4 hover:shadow-md transition-shadow"
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #E4E4E7',
                                    borderRadius: '12px',
                                    padding: '24px',
                                }}
                            >
                                {/* Top row: icon + title + badge */}
                                <div className="flex items-start gap-3">
                                    {/* Icon container */}
                                    <div
                                        className="h-12 w-12 flex items-center justify-center shrink-0"
                                        style={{
                                            backgroundColor: colorScheme.bg,
                                            borderRadius: '8px',
                                        }}
                                    >
                                        <Bot className="h-6 w-6" style={{ color: colorScheme.icon }} />
                                    </div>

                                    {/* Title column */}
                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                        <span className="font-semibold leading-tight truncate" style={{ fontSize: '16px', color: '#09090B' }}>
                                            {agent.name}
                                        </span>
                                        <span style={{ fontSize: '13px', color: '#71717A' }}>
                                            {typeConfig.label} &bull; {agent.model}
                                        </span>
                                    </div>

                                    {/* Status badge */}
                                    {agent.active ? (
                                        <span
                                            className="shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: '#ECFDF5',
                                                color: '#10B981',
                                                fontSize: '12px',
                                                padding: '2px 10px',
                                            }}
                                        >
                                            Activo
                                        </span>
                                    ) : (
                                        <span
                                            className="shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: '#F4F4F5',
                                                color: '#71717A',
                                                fontSize: '12px',
                                                padding: '2px 10px',
                                            }}
                                        >
                                            Inactivo
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                <p className="line-clamp-2" style={{ fontSize: '13px', color: '#3F3F46', lineHeight: '1.4' }}>
                                    {agent.systemPrompt
                                        ? agent.systemPrompt.substring(0, 120) + (agent.systemPrompt.length > 120 ? '...' : '')
                                        : 'Responde preguntas y guía al cliente paso a paso.'}
                                </p>

                                {/* Stats line */}
                                <p style={{ fontSize: '12px', color: '#71717A' }}>
                                    {statsText}
                                </p>

                                {/* Feature pills */}
                                {(agent.calendarEnabled || agent.ecommerceEnabled) && (
                                    <div className="flex flex-wrap gap-2">
                                        {agent.calendarEnabled && (
                                            <span
                                                style={{
                                                    borderRadius: '6px',
                                                    backgroundColor: '#F4F4F5',
                                                    padding: '4px 10px',
                                                    fontSize: '12px',
                                                    color: '#71717A',
                                                }}
                                            >
                                                Google Calendar
                                            </span>
                                        )}
                                        {agent.ecommerceEnabled && (
                                            <span
                                                style={{
                                                    borderRadius: '6px',
                                                    backgroundColor: '#F4F4F5',
                                                    padding: '4px 10px',
                                                    fontSize: '12px',
                                                    color: '#71717A',
                                                }}
                                            >
                                                E-commerce
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-auto pt-2 border-t" style={{ borderColor: '#E4E4E7' }}>
                                    <Link
                                        href={`/${lang}/company/ai-agents/${agent.id}/edit`}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4E7] px-3 py-1.5 text-[13px] font-medium text-[#3F3F46] hover:bg-[#F4F4F5] transition-colors"
                                    >
                                        <Pencil className="h-3 w-3" /> Editar
                                    </Link>
                                    <DeleteAiAgentDialog agentId={agent.id} agentName={agent.name} />
                                    <div className="ml-auto">
                                        <AiAgentStatusToggle id={agent.id} initialStatus={agent.active} />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
