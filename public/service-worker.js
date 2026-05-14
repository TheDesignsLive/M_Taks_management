// public/service-worker.js — Mobile version.
importScripts('https://js.pusher.com/beams/service-worker.js');

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url =
        (event.notification.data && event.notification.data.url) ||
        (event.notification.data && event.notification.data.deep_link) ||
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

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
        const payload = event.data.json();
        const n = payload?.notification
            || payload?.data?.notification
            || payload?.data
            || null;
        if (!n || !n.title) return;

        event.waitUntil(
            Promise.all([
                // 1. Always show the OS notification (works when app is background/closed)
                self.registration.showNotification(n.title, {
                    body: n.body || '',
                    icon: 'https://tms.thedesigns.live/images/tms_logo.jpeg',
                    badge: 'https://tms.thedesigns.live/images/tms_logo.jpeg',
                    tag: 'tms-task-' + Date.now(),
                    data: { url: n.deep_link || 'https://m-tms.thedesigns.live' },
                    requireInteraction: false,
                }),
                // 2. Also forward to open windows for in-app toast
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                    windowClients.forEach(client => {
                        client.postMessage({
                            type: 'BEAMS_PUSH_RECEIVED',
                            title: n.title,
                            body: n.body || '',
                        });
                    });
                }),
            ])
        );
    } catch (e) {}
});