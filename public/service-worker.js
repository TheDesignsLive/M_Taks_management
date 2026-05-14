// public/service-worker.js — Mobile version
importScripts('https://js.pusher.com/beams/service-worker.js');

// Handles FOREGROUND push (app open) — browsers suppress these by default so we show manually
self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
        const payload = event.data.json();

        // Beams wraps payload — try all possible locations
        const n =
            payload?.notification ||
            payload?.data?.notification ||
            payload?.fcm?.notification ||
            payload?.data;

        if (!n || !n.title) return;

        const url =
            payload?.data?.url ||
            payload?.fcm?.data?.url ||
            n.deep_link ||
            n.url ||
            'https://m-tms.thedesigns.live';

        const icon = n.icon || n.image || 'https://tms.thedesigns.live/images/tms_logo.jpeg';

        event.waitUntil(
            self.registration.showNotification(n.title, {
                body: n.body || '',
                icon: icon,
                badge: icon,
                tag: 'tms-push-' + Date.now(),   // unique tag so notifications stack, not replace
                data: { url: url },
                requireInteraction: false,
                silent: false,
                vibrate: [300, 100, 300],
            })
        );
    } catch (e) {
        // Beams FCM background format — ignore parse errors, Beams handles those
    }
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

// Take control immediately
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));