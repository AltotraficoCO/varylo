'use client';

import { useEffect } from 'react';

// Previously we registered /sw.js for PWA support, but that service worker
// caused blank pages by intercepting cross-origin requests blocked by CSP.
// Until we ship a corrected PWA worker, actively unregister any service
// workers and clear their caches so existing browsers recover.
export function PwaRegister() {
    useEffect(() => {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((reg) => reg.unregister().catch(() => {}));
        }).catch(() => {});

        if (typeof window !== 'undefined' && 'caches' in window) {
            caches.keys().then((keys) => {
                keys.forEach((key) => caches.delete(key).catch(() => {}));
            }).catch(() => {});
        }
    }, []);

    return null;
}
