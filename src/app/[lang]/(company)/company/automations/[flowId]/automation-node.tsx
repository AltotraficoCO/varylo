'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Webhook, GitBranch, Bot, Code2, Clock } from 'lucide-react';
import type { AutomationFlowNode } from '@/types/automation';

export interface AutomationNodeData extends Record<string, unknown> {
    flowNode: AutomationFlowNode;
    agentName?: string;
}

const handleBase = '!w-3 !h-3 !border-2 !border-white';

export const AutomationNode = memo(function AutomationNode({ data, selected }: NodeProps) {
    const { flowNode, agentName } = data as unknown as AutomationNodeData;
    const ring = selected ? 'ring-2 ring-offset-2 ring-[#6366F1]' : '';

    // n8n-style: compact card, icon on the left, flow runs left → right.
    if (flowNode.type === 'trigger') {
        return (
            <div className={`relative flex items-center gap-2.5 w-[200px] rounded-lg border border-[#C7D2FE] bg-white shadow-sm px-3 py-2.5 ${ring}`}>
                <div className="w-9 h-9 rounded-md bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center shrink-0">
                    <Webhook className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#1E1B4B] leading-tight">Webhook</p>
                    <p className="text-[11px] text-[#64748B] truncate">recibe el lead</p>
                </div>
                <Handle type="source" position={Position.Right} className={`${handleBase} !bg-[#6366F1] !-right-1.5`} />
            </div>
        );
    }

    if (flowNode.type === 'dispatch_agent') {
        return (
            <div className={`relative flex items-center gap-2.5 w-[210px] rounded-lg border border-[#DDD6FE] bg-white shadow-sm px-3 py-2.5 ${ring}`}>
                <Handle type="target" position={Position.Left} className={`${handleBase} !bg-[#8B5CF6] !-left-1.5`} />
                <div className="w-9 h-9 rounded-md bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#2E1065] leading-tight truncate">{agentName || 'Agente IA'}</p>
                    <p className="text-[11px] text-[#64748B] truncate">
                        {flowNode.template?.name ? flowNode.template.name : 'falta plantilla'}
                    </p>
                </div>
            </div>
        );
    }

    if (flowNode.type === 'cron') {
        return (
            <div className={`relative flex items-center gap-2.5 w-[210px] rounded-lg border border-[#A7F3D0] bg-white shadow-sm px-3 py-2.5 ${ring}`}>
                <div className="w-9 h-9 rounded-md bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#064E3B] leading-tight">Programado</p>
                    <p className="text-[11px] text-[#64748B] truncate">
                        {flowNode.intervalMinutes ? `cada ${flowNode.intervalMinutes} min` : flowNode.schedule || 'sin horario'}
                    </p>
                </div>
                <Handle type="source" position={Position.Right} className={`${handleBase} !bg-[#059669] !-right-1.5`} />
            </div>
        );
    }

    if (flowNode.type === 'code') {
        return (
            <div className={`relative flex items-center gap-2.5 w-[200px] rounded-lg border border-[#CBD5E1] bg-white shadow-sm px-3 py-2.5 ${ring}`}>
                <Handle type="target" position={Position.Left} className={`${handleBase} !bg-[#475569] !-left-1.5`} />
                <div className="w-9 h-9 rounded-md bg-[#F1F5F9] text-[#475569] flex items-center justify-center shrink-0">
                    <Code2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0F172A] leading-tight">Código JS</p>
                    <p className="text-[11px] text-[#64748B] truncate">transforma el payload</p>
                </div>
                <Handle type="source" position={Position.Right} className={`${handleBase} !bg-[#475569] !-right-1.5`} />
            </div>
        );
    }

    // condition — header + one labeled output row per case (+ else), outputs on the right
    const cases = flowNode.cases || [];
    const rows = [
        ...cases.map((c, i) => ({ id: `case-${i}`, label: c.value || '(vacío)', connected: !!c.next, dim: false })),
        { id: 'else', label: 'else', connected: !!flowNode.elseNext, dim: true },
    ];
    return (
        <div className={`relative w-[220px] rounded-lg border border-[#FDE68A] bg-white shadow-sm ${ring}`}>
            <Handle type="target" position={Position.Left} className={`${handleBase} !bg-[#F59E0B] !-left-1.5`} style={{ top: 22 }} />
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#FEF3C7]">
                <div className="w-9 h-9 rounded-md bg-[#FFFBEB] text-[#F59E0B] flex items-center justify-center shrink-0">
                    <GitBranch className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#78350F] leading-tight">Condición</p>
                    <p className="text-[11px] text-[#64748B] truncate">según: {flowNode.field || '—'}</p>
                </div>
            </div>
            <div className="py-1">
                {rows.map(r => (
                    <div key={r.id} className="relative flex items-center justify-end pr-4 pl-3 py-1 text-[11px]">
                        <span className={`truncate ${r.dim ? 'text-[#94A3B8] italic' : 'text-[#475569]'}`}>{r.label}</span>
                        <Handle type="source" position={Position.Right} id={r.id}
                            className={`${handleBase} !-right-1.5 ${r.connected ? '!bg-[#F59E0B]' : '!bg-[#FCD34D]'}`}
                            style={{ top: 'auto' }} />
                    </div>
                ))}
            </div>
        </div>
    );
});
