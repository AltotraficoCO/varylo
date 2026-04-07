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
import { CreateChatbotDialog } from './create-chatbot-dialog';
import { ChatbotStatusToggle } from './chatbot-status-toggle';
import { DeleteChatbotDialog } from './delete-chatbot-dialog';
import Link from 'next/link';
import { Pencil } from 'lucide-react';

export default async function ChatbotsPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const chatbots = await prisma.chatbot.findMany({
        where: { companyId: session.user.companyId },
        include: { channels: true },
        orderBy: { createdAt: 'desc' },
    });

    const channels = await prisma.channel.findMany({
        where: { companyId: session.user.companyId },
    });

    return (
        <SubscriptionGate featureName="Chatbots">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Chatbots</CardTitle>
                    <CardDescription>Gestiona tus chatbots con flujos de decisión automatizados.</CardDescription>
                </div>
                <CreateChatbotDialog channels={channels.map(c => ({ id: c.id, type: c.type }))} />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Canales</TableHead>
                            <TableHead>Prioridad</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {chatbots.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                    No hay chatbots configurados. Crea uno nuevo para empezar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            chatbots.map((chatbot) => (
                                <TableRow key={chatbot.id}>
                                    <TableCell className="font-medium">{chatbot.name}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                            {chatbot.channels.map(ch => (
                                                <Badge key={ch.id} variant="secondary">{ch.type}</Badge>
                                            ))}
                                            {chatbot.channels.length === 0 && (
                                                <span className="text-muted-foreground text-sm">Sin canales</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{chatbot.priority}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <ChatbotStatusToggle id={chatbot.id} initialStatus={chatbot.active} />
                                            <Badge variant={chatbot.active ? "default" : "secondary"}>
                                                {chatbot.active ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link href={`/${lang}/company/chatbots/${chatbot.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Editar Flujo
                                                </Button>
                                            </Link>
                                            <DeleteChatbotDialog chatbotId={chatbot.id} chatbotName={chatbot.name} />
                                        </div>
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
