'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Shows a pulsing "Capturando datos" badge while smart capture is extracting on
 * this conversation. Polls a lightweight endpoint (the app uses polling, not
 * websockets); the backend sets a short-lived `smartCapturingUntil` window.
 */
export function CapturingBadge({ conversationId }: { conversationId: string }) {
    const [capturing, setCapturing] = useState(false);

    useEffect(() => {
        let active = true;
        const check = async () => {
            try {
                const res = await fetch(`/api/conversations/${conversationId}/capturing`, { cache: 'no-store' });
                if (!active) return;
                const data = await res.json();
                setCapturing(!!data.capturing);
            } catch { /* ignore */ }
        };
        check();
        const id = setInterval(check, 3000);
        return () => { active = false; clearInterval(id); };
    }, [conversationId]);

    if (!capturing) return null;

    return (
        <div className="flex items-center gap-1.5 rounded-full bg-violet-100 text-violet-700 px-2.5 py-1 text-xs font-medium animate-pulse">
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600" />
            </span>
            <Sparkles className="h-3.5 w-3.5" />
            Capturando datos…
        </div>
    );
}
