import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Badge } from "@/components/ui/badge"
import { CreateAgentDialog } from './create-agent-dialog';
import { EditAgentDialog } from './edit-agent-dialog';
import { AgentStatusToggle } from './agent-status-toggle';
import { DeleteAgentDialog } from './delete-agent-dialog';
import { ContactAvatar } from '@/components/contact-avatar';

export default async function AgentsPage() {
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
        AGENT: 'Agente',
    };

    const statusColor: Record<string, string> = {
        ONLINE: 'bg-emerald-500',
        BUSY: 'bg-warning',
        OFFLINE: 'bg-zinc-300',
    };

    const statusLabel: Record<string, string> = {
        ONLINE: 'En línea',
        BUSY: 'Ocupado',
        OFFLINE: 'Fuera de línea',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Equipo</h1>
                    <p className="text-sm text-muted-foreground mt-1">Gestiona los agentes de tu empresa</p>
                </div>
                <CreateAgentDialog />
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                    <div className="col-span-3">Nombre</div>
                    <div className="col-span-3">Email</div>
                    <div className="col-span-1">Rol</div>
                    <div className="col-span-2">Estado</div>
                    <div className="col-span-1">Conv. abiertas</div>
                    <div className="col-span-2 text-right">Acciones</div>
                </div>

                {/* Table Body */}
                {agents.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        No hay agentes registrados. Invita a uno nuevo para empezar.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {agents.map((agent) => (
                            <div key={agent.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors">
                                <div className="col-span-3 flex items-center gap-3">
                                    <ContactAvatar name={agent.name || 'Agent'} className="h-8 w-8" />
                                    <span className="text-sm font-medium text-foreground truncate">{agent.name}</span>
                                </div>
                                <div className="col-span-3 text-sm text-muted-foreground truncate">{agent.email}</div>
                                <div className="col-span-1">
                                    <Badge variant={agent.role === 'COMPANY_ADMIN' ? 'default' : 'outline'} className="text-xs">
                                        {roleLabel[agent.role] || agent.role}
                                    </Badge>
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${statusColor[agent.status] || 'bg-zinc-300'}`} />
                                    <span className="text-sm text-muted-foreground">
                                        {statusLabel[agent.status] || agent.status}
                                    </span>
                                </div>
                                <div className="col-span-1 text-sm text-foreground">
                                    {agent._count.assignedConversations}
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-1">
                                    <EditAgentDialog agent={{ id: agent.id, name: agent.name, email: agent.email }} />
                                    <DeleteAgentDialog agentId={agent.id} agentName={agent.name} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
