'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Webhook, GitBranch, Bot } from 'lucide-react';
import type { AutomationFlowNode } from '@/types/automation';

export interface AutomationNodeData extends Record<string, unknown> {
    flowNode: AutomationFlowNode;
    agentName?: string;
}

export const AutomationNode = memo(function AutomationNode({ data, selected }: NodeProps) {
    const { flowNode, agentName } = data as unknown as AutomationNodeData;

    const ring = selected ? 'ring-2 ring-[#6366F1] shadow-lg' : 'hover:shadow-lg';

    if (flowNode.type === 'trigger') {
        return (
            <div className={`w-[240px] rounded-xl border-2 border-[#6366F1] bg-[#EEF2FF] shadow-md transition-shadow ${ring}`}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#6366F1] text-white flex items-center justify-center shrink-0">
                        <Webhook className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-semibold text-sm text-[#312E81]">Webhook (entrada)</span>
                </div>
                <div className="px-3 pb-2.5 text-[11px] text-[#4338CA]">Recibe el lead de tu app</div>
                <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-[#6366F1] !border-2 !border-white" />
            </div>
        );
    }

    if (flowNode.type === 'condition') {
        const cases = flowNode.cases || [];
        return (
            <div className={`w-[260px] rounded-xl border-2 border-[#F59E0B] bg-[#FFFBEB] shadow-md transition-shadow ${ring}`}>
                <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-[#F59E0B] !border-2 !border-white" />
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#FDE68A]">
                    <div className="w-7 h-7 rounded-lg bg-[#F59E0B] text-white flex items-center justify-center shrink-0">
                        <GitBranch className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-semibold text-sm text-[#92400E] block truncate">Condición</span>
                        <span className="text-[10px] text-[#B45309]">campo: {flowNode.field || '—'}</span>
                    </div>
                </div>
                <div>
                    {cases.map((c, i) => (
                        <div key={i} className="relative flex items-center px-3 py-1.5 text-xs border-t border-[#FDE68A]/60">
                            <span className="text-[#92400E] truncate">= {c.value || '(vacío)'}</span>
                            {!c.next && <span className="ml-auto mr-3 text-[9px] text-orange-500 font-medium">sin conectar</span>}
                            <Handle type="source" position={Position.Right} id={`case-${i}`}
                                className={`!w-2.5 !h-2.5 !border-2 !border-white !right-[-5px] ${c.next ? '!bg-[#F59E0B]' : '!bg-orange-300'}`}
                                style={{ top: 'auto' }} />
                        </div>
                    ))}
                    <div className="relative flex items-center px-3 py-1.5 text-xs border-t border-[#FDE68A]/60">
                        <span className="text-[#92400E] italic">else (cualquier otro)</span>
                        {!flowNode.elseNext && <span className="ml-auto mr-3 text-[9px] text-muted-foreground">opcional</span>}
                        <Handle type="source" position={Position.Right} id="else"
                            className={`!w-2.5 !h-2.5 !border-2 !border-white !right-[-5px] ${flowNode.elseNext ? '!bg-[#F59E0B]' : '!bg-gray-300'}`}
                            style={{ top: 'auto' }} />
                    </div>
                </div>
            </div>
        );
    }

    // dispatch_agent (terminal)
    return (
        <div className={`w-[240px] rounded-xl border-2 border-[#8B5CF6] bg-[#F5F3FF] shadow-md transition-shadow ${ring}`}>
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-[#8B5CF6] !border-2 !border-white" />
            <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#8B5CF6] text-white flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-sm text-[#5B21B6] truncate">{agentName || 'Agente IA'}</span>
            </div>
            <div className="px-3 pb-2.5 text-[11px] text-[#6D28D9]">
                {flowNode.template?.name ? `plantilla: ${flowNode.template.name}` : 'falta plantilla'}
            </div>
        </div>
    );
});
