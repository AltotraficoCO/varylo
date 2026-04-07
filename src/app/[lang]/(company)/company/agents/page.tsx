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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateAgentDialog } from './create-agent-dialog';
import { EditAgentDialog } from './edit-agent-dialog';
import { AgentStatusToggle } from './agent-status-toggle';
import { DeleteAgentDialog } from './delete-agent-dialog';

export default async function AgentsPage() {
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const agents = await prisma.user.findMany({
        where: {
            companyId: session.user.companyId,
            role: 'AGENT', // Only show agents as requested
            NOT: {
                id: session.user.id // Exclude self
            }
        },
        orderBy: {
            createdAt: 'desc',
        }
    });

    return (
        <SubscriptionGate featureName="Equipo de Agentes">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Equipo de Agentes</CardTitle>
                    <CardDescription>Gestiona los miembros de tu equipo y sus permisos.</CardDescription>
                </div>
                <CreateAgentDialog />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {agents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                    No hay agentes registrados. Crea uno nuevo para empezar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            agents.map((agent) => (
                                <TableRow key={agent.id}>
                                    <TableCell className="font-medium">{agent.name}</TableCell>
                                    <TableCell>{agent.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={agent.role === 'COMPANY_ADMIN' ? 'default' : 'outline'}>
                                            {agent.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <AgentStatusToggle id={agent.id} initialStatus={agent.active} />
                                            <Badge variant={agent.active ? "default" : "secondary"}>
                                                {agent.active ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right flex items-center justify-end gap-2">
                                        <EditAgentDialog agent={{ id: agent.id, name: agent.name, email: agent.email }} />
                                        <DeleteAgentDialog agentId={agent.id} agentName={agent.name} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        </SubscriptionGate>
    );
}
