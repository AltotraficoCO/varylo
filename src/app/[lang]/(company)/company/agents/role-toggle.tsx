'use client';

import { useState, useTransition } from 'react';
import { setUserRole } from './actions';
import { Role } from '@prisma/client';
import { Loader2 } from 'lucide-react';

interface RoleToggleProps {
    userId: string;
    currentRole: 'AGENT' | 'SUPERVISOR';
}

export function RoleToggle({ userId, currentRole }: RoleToggleProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const next = e.target.value === Role.SUPERVISOR ? Role.SUPERVISOR : Role.AGENT;
        if (next === currentRole) return;
        setError(null);
        startTransition(async () => {
            try {
                await setUserRole(userId, next);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error');
            }
        });
    }

    const baseClass = currentRole === 'SUPERVISOR'
        ? 'bg-[#F5F3FF] text-[#8B5CF6] border-[#DDD6FE]'
        : 'bg-[#EFF6FF] text-[#3B82F6] border-[#BFDBFE]';

    return (
        <div className="flex items-center gap-2">
            <select
                value={currentRole}
                onChange={onChange}
                disabled={isPending}
                className={`appearance-none rounded-xl border px-2.5 py-1 text-xs font-medium cursor-pointer disabled:opacity-50 ${baseClass}`}
            >
                <option value="AGENT">Agente</option>
                <option value="SUPERVISOR">Supervisor</option>
            </select>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#71717A]" />}
            {error && <span className="text-xs text-destructive" title={error}>!</span>}
        </div>
    );
}
