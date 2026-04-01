import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Badge } from "@/components/ui/badge"
import { CreateAiAgentDialog } from './create-ai-agent-dialog';
import { EditAiAgentDialog } from './edit-ai-agent-dialog';
import { DeleteAiAgentDialog } from './delete-ai-agent-dialog';
import { AiAgentStatusToggle } from './ai-agent-status-toggle';
import { AGENT_TYPE_CONFIGS } from '@/lib/ai-agent-types';
import type { AiAgentType } from '@/lib/ai-agent-types';
import { Sparkles, MessageSquare, Calendar } from 'lucide-react';

export default async function AiAgentsPage() {
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
        prisma.ecommerceIntegration.findUnique({
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
                    <h1 className="text-2xl font-semibold text-foreground">Agentes IA</h1>
                    <p className="text-sm text-muted-foreground mt-1">Configura agentes inteligentes que responden por ti</p>
                </div>
                <CreateAiAgentDialog
                    channels={channels.map(c => ({ id: c.id, type: c.type }))}
                    hasGoogleCalendar={hasGoogleCalendar}
                    hasEcommerce={hasEcommerce}
                />
            </div>

            {/* Card Grid */}
            <div className="grid gap-5 md:grid-cols-2">
                {aiAgents.length === 0 ? (
                    <div className="col-span-2 bg-card rounded-xl border p-12 flex flex-col items-center justify-center gap-3 text-center">
                        <div className="p-3 rounded-lg bg-muted">
                            <Sparkles className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-foreground">No hay agentes IA configurados</h3>
                        <p className="text-sm text-muted-foreground">Crea uno nuevo para empezar a automatizar tus respuestas.</p>
                    </div>
                ) : (
                    aiAgents.map((agent) => {
                        const typeConfig = AGENT_TYPE_CONFIGS[agent.agentType as AiAgentType] || AGENT_TYPE_CONFIGS.CUSTOM;
                        return (
                            <div key={agent.id} className="bg-card rounded-xl border p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-foreground">{agent.name}</h3>
                                            <Badge variant={agent.active ? "default" : "secondary"} className="text-xs">
                                                {agent.active ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">{typeConfig.label} • {agent.model}</p>
                                    </div>
                                    <AiAgentStatusToggle id={agent.id} initialStatus={agent.active} />
                                </div>

                                {/* Description */}
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {agent.systemPrompt
                                        ? agent.systemPrompt.substring(0, 120) + (agent.systemPrompt.length > 120 ? '...' : '')
                                        : 'Responde preguntas y guía al cliente paso a paso.'}
                                </p>

                                {/* Channels & Stats */}
                                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                                    {agent.channels.map(ch => (
                                        <span key={ch.id} className="bg-muted px-2 py-0.5 rounded-md">
                                            {channelLabel[ch.type] || ch.type}
                                        </span>
                                    ))}
                                    {agent.channels.length === 0 && (
                                        <span className="text-muted-foreground">Sin canales</span>
                                    )}
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" />
                                        {agent._count.conversations} conversaciones
                                    </span>
                                </div>

                                {/* Calendar & features */}
                                {(agent.calendarEnabled || agent.ecommerceEnabled) && (
                                    <div className="flex items-center gap-2 text-xs border-t pt-3">
                                        {agent.calendarEnabled && (
                                            <span className="flex items-center gap-1 text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                                <Calendar className="h-3 w-3" />
                                                Google Calendar
                                            </span>
                                        )}
                                        {agent.ecommerceEnabled && (
                                            <span className="flex items-center gap-1 text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                                E-commerce
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-auto pt-2 border-t">
                                    <EditAiAgentDialog
                                        agent={{
                                            id: agent.id,
                                            name: agent.name,
                                            agentType: agent.agentType,
                                            systemPrompt: agent.systemPrompt,
                                            contextInfo: agent.contextInfo,
                                            model: agent.model,
                                            temperature: agent.temperature,
                                            transferKeywords: agent.transferKeywords,
                                            channelIds: agent.channels.map(c => c.id),
                                            dataCaptureEnabled: agent.dataCaptureEnabled,
                                            calendarEnabled: agent.calendarEnabled,
                                            calendarId: agent.calendarId,
                                            ecommerceEnabled: agent.ecommerceEnabled,
                                            webhookConfigJson: agent.webhookConfigJson as { url: string; secret?: string; headers?: Record<string, string> } | null,
                                        }}
                                        channels={channels.map(c => ({ id: c.id, type: c.type }))}
                                        hasGoogleCalendar={hasGoogleCalendar}
                                        hasEcommerce={hasEcommerce}
                                    />
                                    <DeleteAiAgentDialog agentId={agent.id} agentName={agent.name} />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
