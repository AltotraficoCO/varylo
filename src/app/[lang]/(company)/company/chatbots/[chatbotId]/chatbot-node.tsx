'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MessageCircle, User, Bot, XCircle, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ChatbotFlowNode } from '@/types/chatbot';

interface ChatbotNodeData extends Record<string, unknown> {
    flowNode: ChatbotFlowNode;
    isStart: boolean;
    label: string;
}

function getActionConfig(type?: string) {
    switch (type) {
        case 'transfer_to_human':
            return { icon: User, label: 'Agente humano', color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/40' };
        case 'transfer_to_ai_agent':
            return { icon: Bot, label: 'Agente IA', color: 'border-purple-400 bg-purple-50 dark:bg-purple-950/40' };
        case 'end_conversation':
            return { icon: XCircle, label: 'Fin', color: 'border-red-400 bg-red-50 dark:bg-red-950/40' };
        default:
            return { icon: MessageCircle, label: 'Mensaje', color: 'border-border bg-card' };
    }
}

export const ChatbotNode = memo(function ChatbotNode({ data, selected }: NodeProps) {
    const nodeData = data as unknown as ChatbotNodeData;
    const { flowNode, isStart, label } = nodeData;
    const config = getActionConfig(flowNode.action?.type);
    const Icon = config.icon;
    const hasOptions = !flowNode.action && (flowNode.options?.length || 0) > 0;

    return (
        <div
            className={`
                w-[280px] rounded-xl border-2 shadow-md transition-shadow
                ${config.color}
                ${selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-lg'}
                ${isStart ? 'border-primary' : ''}
            `}
        >
            {/* Input handle (top) - not for start node */}
            {!isStart && (
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-3 !h-3 !bg-primary !border-2 !border-background"
                />
            )}

            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab" />
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isStart ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-sm truncate flex-1">{label}</span>
                {isStart && <Badge variant="default" className="text-[10px] h-4 px-1.5 shrink-0">INICIO</Badge>}
            </div>

            {/* Message preview */}
            <div className="px-3 py-2">
                {flowNode.message ? (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {flowNode.message}
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground/50 italic">Sin mensaje...</p>
                )}
            </div>

            {/* Action badge */}
            {flowNode.action && (
                <div className="px-3 pb-2.5">
                    <Badge variant="outline" className="text-[10px]">
                        {config.label}
                    </Badge>
                </div>
            )}

            {/* Options as handles */}
            {hasOptions && (
                <div className="border-t border-border/50">
                    {flowNode.options!.map((option, i) => {
                        const isConnected = !!option.nextNodeId;
                        return (
                            <div key={i} className="relative flex items-center px-3 py-1.5 text-xs group">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mr-2 ${isConnected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                    {i + 1}
                                </span>
                                <span className={`truncate ${isConnected ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>{option.label}</span>
                                {!isConnected && (
                                    <span className="ml-auto mr-3 text-[9px] text-orange-500 font-medium">sin conectar</span>
                                )}
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`option-${i}`}
                                    className={`!w-2.5 !h-2.5 !border-2 !border-background !right-[-5px] ${isConnected ? '!bg-primary' : '!bg-orange-400'}`}
                                    style={{ top: 'auto' }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Default source handle if no options and no action */}
            {!hasOptions && !flowNode.action && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!w-3 !h-3 !bg-primary !border-2 !border-background"
                />
            )}
        </div>
    );
});
