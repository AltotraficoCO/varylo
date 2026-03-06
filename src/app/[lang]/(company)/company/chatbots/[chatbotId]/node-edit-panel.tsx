'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Trash2, Plus, MessageCircle, User, Bot, XCircle, Link2, Unlink } from 'lucide-react';
import type { ChatbotFlowNode, ChatbotFlowOption } from '@/types/chatbot';

interface NodeEditPanelProps {
    nodeId: string;
    node: ChatbotFlowNode;
    label: string;
    isStart: boolean;
    allNodes: { id: string; label: string }[];
    onUpdateNode: (nodeId: string, updates: Partial<ChatbotFlowNode>) => void;
    onUpdateLabel: (label: string) => void;
    onDelete: () => void;
    onClose: () => void;
}

export function NodeEditPanel({
    nodeId,
    node,
    label,
    isStart,
    allNodes,
    onUpdateNode,
    onUpdateLabel,
    onDelete,
    onClose,
}: NodeEditPanelProps) {
    const addOption = () => {
        const optionNumber = (node.options?.length || 0) + 1;
        const newOption: ChatbotFlowOption = {
            label: `Opcion ${optionNumber}`,
            match: [String(optionNumber)],
            nextNodeId: '',
        };
        onUpdateNode(nodeId, {
            options: [...(node.options || []), newOption],
        });
    };

    const getConnectedLabel = (nextNodeId: string) => {
        if (!nextNodeId) return null;
        const target = allNodes.find(n => n.id === nextNodeId);
        return target?.label || null;
    };

    const updateOption = (optIndex: number, updates: Partial<ChatbotFlowOption>) => {
        const options = [...(node.options || [])];
        options[optIndex] = { ...options[optIndex], ...updates };
        onUpdateNode(nodeId, { options });
    };

    const removeOption = (optIndex: number) => {
        const options = (node.options || [])
            .filter((_, i) => i !== optIndex)
            .map((opt, newIndex) => {
                const visibleNumber = String(newIndex + 1);
                const fullLabel = opt.label.toLowerCase().trim();
                const words = fullLabel.split(/\s+/).filter(w => w.length >= 2);
                const matchSet = new Set([visibleNumber, ...(fullLabel ? [fullLabel] : []), ...words]);
                return { ...opt, match: Array.from(matchSet) };
            });
        onUpdateNode(nodeId, { options });
    };

    const getActionIcon = (type?: string) => {
        switch (type) {
            case 'transfer_to_human': return <User className="h-4 w-4" />;
            case 'transfer_to_ai_agent': return <Bot className="h-4 w-4" />;
            case 'end_conversation': return <XCircle className="h-4 w-4" />;
            default: return <MessageCircle className="h-4 w-4" />;
        }
    };

    return (
        <div className="absolute right-0 top-0 bottom-0 w-[380px] border-l bg-background overflow-y-auto z-20">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background z-10">
                <div className="flex items-center gap-2 min-w-0">
                    {getActionIcon(node.action?.type)}
                    <span className="font-semibold text-sm truncate">Editar paso</span>
                    {isStart && <Badge variant="default" className="text-[10px] h-4 px-1.5">INICIO</Badge>}
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="p-4 space-y-5">
                {/* Node name */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nombre del paso</Label>
                    <Input
                        value={label}
                        onChange={(e) => onUpdateLabel(e.target.value)}
                        placeholder="Nombre del paso..."
                        className="h-9"
                    />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mensaje del chatbot</Label>
                    <Textarea
                        value={node.message}
                        onChange={(e) => onUpdateNode(nodeId, { message: e.target.value })}
                        rows={4}
                        placeholder="Escribe el mensaje que vera el cliente..."
                        className="resize-none"
                    />
                </div>

                {/* Action type */}
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Que hace este paso?</Label>
                    <select
                        value={node.action?.type || 'show_options'}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'show_options') {
                                onUpdateNode(nodeId, { action: undefined });
                            } else {
                                onUpdateNode(nodeId, {
                                    action: { type: value as 'transfer_to_human' | 'transfer_to_ai_agent' | 'end_conversation' },
                                    options: [],
                                });
                            }
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="show_options">Mostrar opciones al cliente</option>
                        <option value="transfer_to_human">Transferir a agente humano</option>
                        <option value="transfer_to_ai_agent">Transferir a agente IA</option>
                        <option value="end_conversation">Finalizar conversacion</option>
                    </select>
                </div>

                {/* Options */}
                {!node.action && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Opciones para el cliente</Label>
                            <span className="text-[10px] text-muted-foreground">{node.options?.length || 0} opciones</span>
                        </div>

                        {(node.options || []).map((option, optIndex) => (
                            <div key={optIndex} className="space-y-2 p-3 bg-muted/40 rounded-lg border border-border/50">
                                <div className="flex items-center justify-between">
                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                        {optIndex + 1}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeOption(optIndex)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                <Input
                                    value={option.label}
                                    onChange={(e) => {
                                        const optLabel = e.target.value;
                                        const visibleNumber = String(optIndex + 1);
                                        const fullLabel = optLabel.toLowerCase().trim();
                                        const words = fullLabel.split(/\s+/).filter(w => w.length >= 2);
                                        const matchSet = new Set([visibleNumber, ...(fullLabel ? [fullLabel] : []), ...words]);
                                        updateOption(optIndex, {
                                            label: optLabel,
                                            match: Array.from(matchSet),
                                        });
                                    }}
                                    placeholder="Texto de la opcion"
                                    className="h-8 text-sm"
                                />
                                {option.nextNodeId && getConnectedLabel(option.nextNodeId) ? (
                                    <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                                        <Link2 className="h-3 w-3" />
                                        <span>Conectado a: <strong>{getConnectedLabel(option.nextNodeId)}</strong></span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Unlink className="h-3 w-3" />
                                        <span>Arrastra la linea en el canvas para conectar</span>
                                    </div>
                                )}
                            </div>
                        ))}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addOption}
                            className="w-full border-dashed"
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Agregar opcion
                        </Button>
                    </div>
                )}

                {/* Preview */}
                {node.message && !node.action && (node.options?.length || 0) > 0 && (
                    <div className="border rounded-lg p-3 bg-muted/20">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Vista previa</p>
                        <div className="bg-background rounded-lg p-3 shadow-sm border text-sm space-y-2">
                            <p className="whitespace-pre-wrap">{node.message}</p>
                            <div className="border-t pt-2 space-y-1">
                                {(node.options || []).map((opt, i) => (
                                    <p key={i} className="text-muted-foreground">
                                        <span className="font-medium text-foreground">{i + 1}.</span> {opt.label}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete button */}
                {!isStart && (
                    <div className="pt-4 border-t">
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={onDelete}
                        >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Eliminar paso
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
