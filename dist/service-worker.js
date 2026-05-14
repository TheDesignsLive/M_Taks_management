// public/service-worker.js — Mobile version
// ✅ Beams handles ALL background (app closed) push automatically
// public/service-worker.js — Mobile version
importScripts('https://js.pusher.com/beams/service-worker.js');

// Forward push payload to open app windows (foreground in-app toast)
// We do NOT call event.waitUntil() — Beams handles the actual notification display.
// This listener just messages the page so it can show an in-app banner when visible.
self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
        const payload = event.data.json();
        const n = payload?.notification || payload?.data?.notification || payload?.data;
        if (!n || !n.title) return;

        // Tell all open windows about this push so they can show an in-app toast
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            windowClients.forEach((client) => {
                if (client.url.includes('m-tms.thedesigns.live')) {
                    client.postMessage({
                        type: 'BEAMS_PUSH_RECEIVED',
                        title: n.title,
                        body: n.body || '',
                    });
                }
            });
        });
        // Do NOT call event.waitUntil() — Beams handles showing the OS notification
    } catch (e) {}
});

// public/service-worker.js — Mobile version
importScripts('https://js.pusher.com/beams/service-worker.js');

// Forward push payload to open app windows (foreground in-app toast)
// We do NOT call event.waitUntil() — Beams handles the actual notification display.
// This listener just messages the page so it can show an in-app banner when visible.
self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
        const payload = event.data.json();
        const n = payload?.notification || payload?.data?.notification || payload?.data;
        if (!n || !n.title) return;

        // Tell all open windows about this push so they can show an in-app toast
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            windowClients.forEach((client) => {
                if (client.url.includes('m-tms.thedesigns.live')) {
                    client.postMessage({
                        type: 'BEAMS_PUSH_RECEIVED',
                        title: n.title,
                        body: n.body || '',
                    });
                }
            });
        });
        // Do NOT call event.waitUntil() — Beams handles showing the OS notification
    } catch (e) {}
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url =
        (event.notification.data && event.notification.data.url) ||
        'https://m-tms.thedesigns.live';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes('m-tms.thedesigns.live') && 'focus' in client) {
                    return client.focus().then(() => {
                        if ('navigate' in client) return client.navigate(url);
                    });
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// Take control immediately — no waiting for old SW to die
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url =
        (event.notification.data && event.notification.data.url) ||
        'https://m-tms.thedesigns.live';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes('m-tms.thedesigns.live') && 'focus' in client) {
                    return client.focus().then(() => {
                        if ('navigate' in client) return client.navigate(url);
                    });
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// Take control immediately — no waiting for old SW to die
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));