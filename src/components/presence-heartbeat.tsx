'use client';

import { useEffect } from 'react';

const HEARTBEAT_INTERVAL_MS = 60_000;
const ENDPOINT = '/api/presence/heartbeat';

/**
 * Keeps the current user's connection session alive while a dashboard tab is
 * open. Mounted once per authenticated layout. Sends a heartbeat on mount,
 * on an interval, and when the tab becomes visible again; sends an "end"
 * signal when the tab is closed/hidden so connection time stays accurate.
 */
export function PresenceHeartbeat() {
    useEffect(() => {
        let cancelled = false;

        const beat = () => {
            if (cancelled) return;
            fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
                keepalive: true,
            }).catch(() => {});
        };

        beat();
        const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);

        const onVisibility = () => {
            if (document.visibilityState === 'visible') beat();
        };
        document.addEventListener('visibilitychange', onVisibility);

        const onLeave = () => {
            try {
                const blob = new Blob([JSON.stringify({ event: 'end' })], { type: 'application/json' });
                navigator.sendBeacon(ENDPOINT, blob);
            } catch {
                /* ignore */
            }
        };
        window.addEventListener('pagehide', onLeave);

        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', onLeave);
        };
    }, []);

    return null;
}
