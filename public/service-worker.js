// public/service-worker.js — Mobile version
// ✅ Beams handles ALL background (app closed) push automatically
importScripts('https://js.pusher.com/beams/service-worker.js');

// ✅ FOREGROUND ONLY: Only show notification manually when app IS open
// When app is closed, Beams service worker (above) handles it natively — do NOT interfere
self.addEventListener('push', (event) => {
    if (!event.data) return;

    // Check if any app window is open/visible
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            const appIsOpen = windowClients.some(c =>
                c.url.includes('m-tms.thedesigns.live') && c.visibilityState === 'visible'
            );

            // ✅ App is CLOSED or hidden — let Beams handle it, do nothing
            if (!appIsOpen) return;

            // ✅ App is OPEN — browser suppresses push UI, so show it manually
            try {
                const payload = event.data.json();

                const n =
                    payload?.notification ||
                    payload?.data?.notification ||
                    payload?.data;

                if (!n || !n.title) return;

                const url =
                    payload?.data?.url ||
                    n.deep_link ||
                    n.url ||
                    'https://m-tms.thedesigns.live';

                const icon = n.icon || n.image || 'https://tms.thedesigns.live/images/tms_logo.jpeg';

                return self.registration.showNotification(n.title, {
                    body: n.body || '',
                    icon: icon,
                    badge: icon,
                    tag: 'tms-push-' + Date.now(),
                    data: { url: url },
                    requireInteraction: false,
                    silent: false,
                    vibrate: [300, 100, 300],
                });
            } catch (e) {
                // ignore parse errors — Beams internal format
            }
        })
    );
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