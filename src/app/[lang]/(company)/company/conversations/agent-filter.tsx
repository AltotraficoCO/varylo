'use client';

import * as React from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';

interface AgentFilterProps {
    agents: { id: string; name: string | null; email: string }[];
    selected?: string;
}

const ALL = '__all__';

export function AgentFilter({ agents, selected }: AgentFilterProps) {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const lang = params.lang as string;

    const handleChange = (value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        // Drop any selected conversation when changing the agent scope.
        next.delete('conversationId');
        if (value === ALL) {
            next.delete('agent');
        } else {
            next.set('agent', value);
        }
        router.push(`/${lang}/company/conversations?${next.toString()}`);
    };

    return (
        <Select value={selected || ALL} onValueChange={handleChange}>
            <SelectTrigger className="h-9 bg-background text-sm">
                <span className="flex items-center gap-2 min-w-0">
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por agente" />
                </span>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={ALL}>Todos los agentes</SelectItem>
                {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                        {agent.name || agent.email}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
