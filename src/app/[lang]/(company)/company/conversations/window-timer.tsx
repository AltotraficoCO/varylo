'use client';

import { useEffect, useState } from 'react';
import { useRealtimeData } from './realtime-context';
import { Clock } from 'lucide-react';

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function formatRemaining(ms: number): string {
    if (ms <= 0) return 'Expirada';
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    return `${seconds}s`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));

    const time = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) return `hoy ${time}`;
    if (diffDays === 1) return `ayer ${time}`;
    const day = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    return `${day} ${time}`;
}

export function WindowTimer({ conversationId }: { conversationId: string }) {
    const { conversations } = useRealtimeData();
    const [remaining, setRemaining] = useState<number | null>(null);

    const conv = conversations.find(c => c.id === conversationId);
    const lastInboundAt = conv?.lastInboundAt;

    useEffect(() => {
        if (!lastInboundAt) {
            setRemaining(null);
            return;
        }

        function compute() {
            const elapsed = Date.now() - new Date(lastInboundAt!).getTime();
            setRemaining(Math.max(0, WINDOW_MS - elapsed));
        }

        compute();
        const interval = setInterval(compute, 1_000);
        return () => clearInterval(interval);
    }, [lastInboundAt]);

    if (remaining === null) return null;

    const isExpired = remaining <= 0;
    const isLow = remaining > 0 && remaining < 2 * 60 * 60 * 1000; // < 2h

    return (
        <div className="flex flex-col items-end gap-0.5">
            <div
                className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    isExpired
                        ? 'bg-red-100 text-red-700'
                        : isLow
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                }`}
            >
                <Clock className="h-3 w-3" />
                {formatRemaining(remaining)}
            </div>
            {lastInboundAt && (
                <span className="text-[10px] text-muted-foreground px-2">
                    Último msg: {formatDate(lastInboundAt)}
                </span>
            )}
        </div>
    );
}
