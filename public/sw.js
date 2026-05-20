// Kill-switch service worker.
// Previous versions intercepted cross-origin requests (Google Fonts) which were
// blocked by CSP, breaking navigations and producing blank pages.
// This worker registers no fetch handler and unregisters itself, so the browser
// reverts to standard network behaviour on the next page load.

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.registration.unregister().catch(() => {}));
});

// No fetch handler — let the browser handle every request directly.
