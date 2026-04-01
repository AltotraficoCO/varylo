import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreateChatbotDialog } from './create-chatbot-dialog';
import { ChatbotStatusToggle } from './chatbot-status-toggle';
import { DeleteChatbotDialog } from './delete-chatbot-dialog';
import Link from 'next/link';
import { Pencil, Bot, Plus, GitBranch } from 'lucide-react';

export default async function ChatbotsPage({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params;
    const session = await auth();
    if (!session?.user?.companyId) return null;

    const chatbots = await prisma.chatbot.findMany({
        where: { companyId: session.user.companyId },
        include: { channels: true, _count: { select: { channels: true } } },
        orderBy: { createdAt: 'desc' },
    });

    const channels = await prisma.channel.findMany({
        where: { companyId: session.user.companyId },
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Chatbots</h1>
                    <p className="text-sm text-muted-foreground mt-1">Crea flujos automatizados para tus conversaciones</p>
                </div>
                <CreateChatbotDialog channels={channels.map(c => ({ id: c.id, type: c.type }))} />
            </div>

            {/* Card Grid */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {chatbots.map((chatbot) => (
                    <div key={chatbot.id} className="bg-card rounded-xl border p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="p-2.5 rounded-lg bg-muted">
                                <Bot className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex items-center gap-2">
                                <ChatbotStatusToggle id={chatbot.id} initialStatus={chatbot.active} />
                                <Badge variant={chatbot.active ? "default" : "secondary"} className="text-xs">
                                    {chatbot.active ? "Activo" : "Inactivo"}
                                </Badge>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-foreground">{chatbot.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                Flujo de conversación automatizado
                            </p>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2 border-t">
                            <span className="flex items-center gap-1">
                                <GitBranch className="h-3.5 w-3.5" />
                                {chatbot.flowJson ? (Array.isArray(chatbot.flowJson) ? (chatbot.flowJson as any[]).length : 0) : 0} nodos
                            </span>
                            <span>•</span>
                            <span>{chatbot._count.channels} {chatbot._count.channels === 1 ? 'canal' : 'canales'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link href={`/${lang}/company/chatbots/${chatbot.id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full text-xs">
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                    Editar Flujo
                                </Button>
                            </Link>
                            <DeleteChatbotDialog chatbotId={chatbot.id} chatbotName={chatbot.name} />
                        </div>
                    </div>
                ))}

                {/* Create new card */}
                <div className="bg-card rounded-xl border border-dashed p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[200px] hover:border-primary/50 hover:bg-muted/30 transition-colors">
                    <div className="p-3 rounded-lg bg-muted">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground text-sm">Crear nuevo chatbot</h3>
                        <p className="text-xs text-muted-foreground mt-1">Diseña flujos visuales sin código</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
