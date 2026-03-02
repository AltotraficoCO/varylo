'use client';

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContactAvatar } from "@/components/contact-avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, Pin, Trash2, StickyNote, Phone, Building, RefreshCw, Loader2, Sparkles, TriangleAlert, CheckCircle2 } from "lucide-react";
import { AgentSelector } from "./agent-selector";
import { TagSelector } from "./tag-selector";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConversationRightSidebarProps {
    conversation: any;
    companyTags: any[];
    companyAgents: any[];
    className?: string;
    isAgent?: boolean;
    insight?: any;
}

import { useRouter, useParams } from "next/navigation";
import { deleteConversation, closeConversation, updatePriority, reanalyzeConversation } from "./actions";

export function ConversationRightSidebar({ conversation, companyTags, companyAgents, className, isAgent, insight }: ConversationRightSidebarProps) {
    const contact = conversation.contact || {};
    const router = useRouter();
    const params = useParams();
    const lang = params.lang as string;
    const [analyzing, setAnalyzing] = React.useState(false);

    const handleReanalyze = async () => {
        setAnalyzing(true);
        try {
            await reanalyzeConversation(conversation.id);
            router.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    const [closing, setClosing] = React.useState(false);

    const handleClose = async () => {
        setClosing(true);
        try {
            const result = await closeConversation(conversation.id);
            if (result.success) {
                router.push(`/${lang}/company/conversations`);
                router.refresh();
            } else {
                alert(result.message || "Error al cerrar la conversación");
            }
        } catch (e) {
            alert("Error inesperado al cerrar");
        } finally {
            setClosing(false);
        }
    };

    const handleDelete = async () => {
        try {
            const result = await deleteConversation(conversation.id);
            if (result.success) {
                router.push(`/${lang}/company/conversations`);
                router.refresh();
            } else {
                alert("Error al eliminar la conversación");
            }
        } catch (e) {
            alert("Error inesperado al eliminar");
        }
    };

    const handlePriorityChange = async (priority: 'LOW' | 'MEDIUM' | 'HIGH') => {
        try {
            await updatePriority(conversation.id, priority);
        } catch (e) {
            console.error(e);
        }
    }

    const currentPriority = conversation.priority || 'MEDIUM';

    return (
        <div className={cn("bg-muted/20 flex flex-col h-full min-h-0 border-l", className)}>
            <Tabs defaultValue="contact" className="w-full flex-1 flex flex-col min-h-0">
                {/* ... TabsList ... */}
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b h-11 bg-transparent p-0">
                    <TabsTrigger
                        value="contact"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full"
                    >
                        Contacto
                    </TabsTrigger>
                    <TabsTrigger
                        value="copilot"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full"
                    >
                        ValerIA
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="contact" className="flex-1 overflow-y-auto p-0 m-0 min-h-0">
                    {/* Profile Header */}
                    <div className="p-6 flex flex-col items-center border-b bg-card">
                        <ContactAvatar
                            name={contact.name}
                            phone={contact.phone}
                            imageUrl={contact.imageUrl}
                            className="h-20 w-20 mb-3 border"
                            fallbackClassName="text-xl"
                        />
                        <h2 className="font-semibold text-lg text-foreground text-center leading-tight mb-1">{contact.name || 'Desconocido'}</h2>
                        <p className="text-sm text-muted-foreground text-center">Cliente</p>

                        {/* Info Rows */}
                        <div className="w-full mt-6 space-y-3 text-sm">
                            {contact.phone && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <Phone className="h-4 w-4 shrink-0 opacity-70" />
                                    <span>{contact.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-gray-600">
                                <Building className="h-4 w-4 shrink-0 opacity-70" />
                                <span>{contact.companyName || 'Empresa (N/A)'}</span>
                            </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex gap-2 mt-6 w-full justify-center">
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-muted border-gray-200 text-gray-600 hover:text-primary hover:border-primary/50"><MessageSquare className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-muted border-gray-200 text-gray-600 hover:text-primary hover:border-primary/50"><StickyNote className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-muted border-gray-200 text-gray-600 hover:text-primary hover:border-primary/50"><Pin className="h-4 w-4" /></Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-muted border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-500/50" disabled={closing}>
                                        {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Finalizar conversación?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Se enviará un mensaje de despedida al cliente y la conversación se marcará como resuelta.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClose} className="bg-green-600 text-white hover:bg-green-700">
                                            Finalizar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            {!isAgent && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-muted border-gray-200 text-gray-600 hover:text-destructive hover:border-destructive/50"><Trash2 className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer. Se eliminarán permanentemente todos los mensajes y notas asociadas.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>

                    {/* Accordions */}
                    <Accordion type="multiple" defaultValue={['actions', 'participants']} className="w-full bg-card">
                        <AccordionItem value="actions" className="border-b px-0">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted text-sm font-semibold text-gray-800">
                                Acciones
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-1">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Etiquetas</label>
                                        <TagSelector
                                            conversationId={conversation.id}
                                            availableTags={companyTags}
                                            selectedTags={conversation.tags || []}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agentes Asignados</label>
                                        <AgentSelector
                                            conversationId={conversation.id}
                                            availableAgents={companyAgents}
                                            selectedAgents={conversation.assignedAgents || []}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioridad</label>
                                        <div className="flex gap-2">
                                            <Badge
                                                variant={currentPriority === 'LOW' ? 'default' : 'outline'}
                                                className={cn("cursor-pointer hover:bg-gray-100 font-normal", currentPriority === 'LOW' && "bg-green-100 text-green-700 hover:bg-green-200 border-green-200")}
                                                onClick={() => handlePriorityChange('LOW')}
                                            >
                                                Baja
                                            </Badge>
                                            <Badge
                                                variant={currentPriority === 'MEDIUM' ? 'default' : 'outline'}
                                                className={cn("cursor-pointer hover:bg-gray-100 font-normal", currentPriority === 'MEDIUM' && "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200")}
                                                onClick={() => handlePriorityChange('MEDIUM')}
                                            >
                                                Media
                                            </Badge>
                                            <Badge
                                                variant={currentPriority === 'HIGH' ? 'default' : 'outline'}
                                                className={cn("cursor-pointer hover:bg-gray-100 font-normal", currentPriority === 'HIGH' && "bg-red-100 text-red-700 hover:bg-red-200 border-red-200")}
                                                onClick={() => handlePriorityChange('HIGH')}
                                            >
                                                Alta
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="participants" className="border-b px-0">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted text-sm font-semibold text-gray-800">
                                Participantes
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-1">
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</label>
                                        <div className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md border">
                                            <Avatar className="h-6 w-6"><AvatarFallback>C</AvatarFallback></Avatar>
                                            <span className="truncate">{contact.name || contact.phone || 'Cliente'}</span>
                                        </div>
                                    </div>

                                    {conversation.assignedAgents && conversation.assignedAgents.length > 0 && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agentes</label>
                                            <div className="flex flex-col gap-2">
                                                {conversation.assignedAgents.map((agent: any) => (
                                                    <div key={agent.id} className="flex items-center gap-2 text-sm p-2 bg-primary/5 rounded-md border border-blue-100">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                                                {agent.name?.[0]?.toUpperCase() || 'A'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="truncate text-gray-700">{agent.name || agent.email}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="info" className="border-b px-0">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted text-sm font-semibold text-gray-800">
                                Información
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 pt-1">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <span className="text-muted-foreground">ID:</span>
                                    <span className="truncate font-mono">{conversation.id.substring(0, 8)}</span>
                                    <span className="text-muted-foreground">Creado:</span>
                                    <span>{new Date(conversation.createdAt).toLocaleDateString()}</span>
                                    <span className="text-muted-foreground">Canal:</span>
                                    <span>{conversation.channel?.type || 'Desconocido'}</span>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </TabsContent>

                <TabsContent value="copilot" className="flex-1 overflow-y-auto p-0 m-0 min-h-0">
                    <div className="p-4 space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                <h3 className="font-semibold text-sm text-foreground">Análisis IA</h3>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReanalyze}
                                disabled={analyzing}
                                className="h-7 text-xs gap-1.5"
                            >
                                {analyzing ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-3 w-3" />
                                )}
                                {analyzing ? 'Analizando...' : 'Re-analizar'}
                            </Button>
                        </div>

                        {insight ? (() => {
                            const flags = insight.flagsJson as { sentiment?: string; topics?: string[]; urgency?: string } | null;
                            const sentiment = flags?.sentiment || 'neutral';
                            const topics = flags?.topics || [];
                            const urgency = flags?.urgency || 'medium';

                            const sentimentConfig: Record<string, { label: string; color: string }> = {
                                positive: { label: 'Positivo', color: 'bg-green-100 text-green-700 border-green-200' },
                                neutral: { label: 'Neutral', color: 'bg-gray-100 text-gray-700 border-gray-200' },
                                negative: { label: 'Negativo', color: 'bg-red-100 text-red-700 border-red-200' },
                            };

                            const urgencyConfig: Record<string, { label: string; color: string }> = {
                                low: { label: 'Baja', color: 'bg-green-100 text-green-700 border-green-200' },
                                medium: { label: 'Media', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                                high: { label: 'Alta', color: 'bg-red-100 text-red-700 border-red-200' },
                            };

                            const getScoreColor = (score: number) => {
                                if (score >= 70) return 'bg-green-500';
                                if (score >= 40) return 'bg-yellow-500';
                                return 'bg-red-500';
                            };

                            return (
                                <div className="space-y-4">
                                    {/* Summary */}
                                    <div className="bg-card rounded-lg border p-3 space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resumen</label>
                                        <p className="text-sm text-gray-700 leading-relaxed">{insight.summary}</p>
                                    </div>

                                    {/* Scores */}
                                    <div className="bg-card rounded-lg border p-3 space-y-3">
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Puntuaciones</label>
                                        <div className="space-y-2">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-gray-600">Tono</span>
                                                    <span className="font-medium">{insight.toneScore}/100</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all", getScoreColor(insight.toneScore))}
                                                        style={{ width: `${insight.toneScore}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-gray-600">Claridad</span>
                                                    <span className="font-medium">{insight.clarityScore}/100</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all", getScoreColor(insight.clarityScore))}
                                                        style={{ width: `${insight.clarityScore}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sentiment & Urgency */}
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-card rounded-lg border p-3 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sentimiento</label>
                                            <div>
                                                <Badge variant="outline" className={cn("text-xs font-normal", sentimentConfig[sentiment]?.color)}>
                                                    {sentimentConfig[sentiment]?.label || sentiment}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-card rounded-lg border p-3 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Urgencia</label>
                                            <div>
                                                <Badge variant="outline" className={cn("text-xs font-normal", urgencyConfig[urgency]?.color)}>
                                                    {urgency === 'high' && <TriangleAlert className="h-3 w-3 mr-1" />}
                                                    {urgencyConfig[urgency]?.label || urgency}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Topics */}
                                    {topics.length > 0 && (
                                        <div className="bg-card rounded-lg border p-3 space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Temas</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {topics.map((topic: string, i: number) => (
                                                    <Badge key={i} variant="secondary" className="text-xs font-normal bg-purple-50 text-purple-700 border border-purple-200">
                                                        {topic}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Timestamp */}
                                    <p className="text-[10px] text-muted-foreground text-center">
                                        Analizado: {new Date(insight.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            );
                        })() : (
                            <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
                                <div className="bg-purple-50 p-3 rounded-full">
                                    <Sparkles className="h-6 w-6 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Sin análisis disponible</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Haz clic en &quot;Re-analizar&quot; para generar un análisis con IA
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
