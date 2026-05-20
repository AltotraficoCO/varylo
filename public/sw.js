// Kill-switch service worker.
// Previous versions intercepted cross-origin requests (Google Fonts) which were
// blocked by CSP, breaking navigations and producing blank pages.
// This worker unregisters itself on activation and reloads every client so the
// browser falls back to standard network behaviour.

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            try {
                await self.registration.unregister();
                const clients = await self.clients.matchAll({ type: 'window' });
                for (const client of clients) {
                    try {
                        client.navigate(client.url);
                    } catch {
                        // ignore — client may have been navigated already
                    }
                }
            } catch {
                // best-effort cleanup
            }
        })()
    );
});

// No fetch handler — let the browser handle every request directly.
