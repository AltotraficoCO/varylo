'use client';

import { useState, useTransition } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateUserStatus } from "@/lib/user-status";
import { useDictionary } from '@/lib/i18n-context';

const STATUS_CONFIG = {
    ONLINE: { labelKey: 'online' as const, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    BUSY: { labelKey: 'busy' as const, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    OFFLINE: { labelKey: 'offline' as const, color: 'bg-gray-400', textColor: 'text-gray-500' },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

export function StatusSelector({ initialStatus }: { initialStatus: StatusKey }) {
    const [status, setStatus] = useState<StatusKey>(initialStatus);
    const [isPending, startTransition] = useTransition();
    const dict = useDictionary();
    const common = dict.dashboard?.common || {};

    const handleStatusChange = (newStatus: StatusKey) => {
        setStatus(newStatus);
        startTransition(async () => {
            await updateUserStatus(newStatus);
        });
    };

    const current = STATUS_CONFIG[status];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 gap-2 text-xs font-medium px-3",
                        isPending && "opacity-60"
                    )}
                    disabled={isPending}
                >
                    <span className={cn("h-2.5 w-2.5 rounded-full", current.color)} />
                    {common[current.labelKey]}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {(Object.entries(STATUS_CONFIG) as [StatusKey, typeof STATUS_CONFIG[StatusKey]][]).map(([key, config]) => (
                    <DropdownMenuItem
                        key={key}
                        onClick={() => handleStatusChange(key)}
                        className={cn(
                            "flex items-center gap-2 text-sm cursor-pointer",
                            status === key && "font-medium"
                        )}
                    >
                        <span className={cn("h-2.5 w-2.5 rounded-full", config.color)} />
                        {common[config.labelKey]}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
