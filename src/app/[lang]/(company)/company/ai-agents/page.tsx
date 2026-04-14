import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { SubscriptionGate } from '@/components/subscription-gate';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateAiAgentDialog } from './create-ai-agent-dialog';
import { EditAiAgentDialog } from './edit-ai-agent-dialog';
import { DeleteAiAgentDialog } from './delete-ai-agent-dialog';
import { AiAgentStatusToggle } from './ai-agent-status-toggle';
import { AGENT_TYPE_CONFIGS } from '@/lib/ai-agent-types';
import type { AiAgentType } from '@/lib/ai-agent-types';

export default async function AiAgentsPage() {
    const session = await auth();
    if (!session?.user?.companyId) return null;

    console.log('[AI Agents Page] Loading for companyId:', session.user.companyId);

    let aiAgents: any[] = [], channels: any[] = [], company: any = null, ecommerceIntegration: any = null;

    try {
        console.log('[AI Agents Page] Step 1: aiAgent.findMany');
        aiAgents = await prisma.aiAgent.findMany({
            where: { companyId: session.user.companyId },
            include: { channels: true },
            orderBy: { createdAt: 'desc' },
        });
        console.log('[AI Agents Page] Step 1 OK, agents:', aiAgents.length);
    } catch (e: any) {
        console.error('[AI Agents Page] ERROR en aiAgent.findMany:', e.message, e.stack);
        throw e;
    }

    try {
        console.log('[AI Agents Page] Step 2: channel.findMany + company.findUnique + ecommerceIntegration.findUnique');
        [channels, company, ecommerceIntegration] = await Promise.all([
            prisma.channel.findMany({ where: { companyId: session.user.companyId } }),
            prisma.company.findUnique({
                where: { id: session.user.companyId },
                select: { googleCalendarRefreshToken: true },
            }),
            prisma.ecommerceIntegration.findUnique({
                where: { companyId: session.user.companyId },
                select: { active: true },
            }),
        ]);
        console.log('[AI Agents Page] Step 2 OK');
    } catch (e: any) {
        console.error('[AI Agents Page] ERROR en step 2:', e.message, e.stack);
        throw e;
    }

    const hasGoogleCalendar = !!company?.googleCalendarRefreshToken;
    const hasEcommerce = !!ecommerceIntegration?.active;

    return (
        <SubscriptionGate featureName="Agentes IA">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Agentes IA</CardTitle>
                    <CardDescription>Gestiona tus agentes de inteligencia artificial que responden automáticamente.</CardDescription>
                </div>
                <CreateAiAgentDialog channels={channels.map(c => ({ id: c.id, type: c.type }))} hasGoogleCalendar={hasGoogleCalendar} hasEcommerce={hasEcommerce} />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Modelo</TableHead>
                            <TableHead>Canales</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {aiAgents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                    No hay agentes IA configurados. Crea uno nuevo para empezar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            aiAgents.map((agent) => {
                                const typeConfig = AGENT_TYPE_CONFIGS[agent.agentType as AiAgentType] || AGENT_TYPE_CONFIGS.CUSTOM;
                                return (
                                    <TableRow key={agent.id}>
                                        <TableCell className="font-medium">{agent.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{typeConfig.label}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{agent.model}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 flex-wrap">
                                                {agent.channels.map(ch => (
                                                    <Badge key={ch.id} variant="secondary">{ch.type}</Badge>
                                                ))}
                                                {agent.channels.length === 0 && (
                                                    <span className="text-muted-foreground text-sm">Sin canales</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <AiAgentStatusToggle id={agent.id} initialStatus={agent.active} />
                                                <Badge variant={agent.active ? "default" : "secondary"}>
                                                    {agent.active ? "Activo" : "Inactivo"}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
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
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        </SubscriptionGate>
    );
}
