// public/service-worker.js — Mobile version
// DO NOT import Beams service worker — it conflicts with publishToInterests()
// importScripts('https://js.pusher.com/beams/service-worker.js'); // REMOVED

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

self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
        const payload = event.data.json();
        const n = payload?.notification
            || payload?.data?.notification
            || payload?.aps?.alert
            || null;
        const title = n?.title || payload?.title || payload?.data?.title || null;
        const body  = n?.body  || payload?.body  || payload?.data?.body  || '';
        const deepLink = payload?.data?.url || payload?.data?.deep_link || 'https://m-tms.thedesigns.live';
        if (!title) return;

        event.waitUntil(
            Promise.all([
                self.registration.showNotification(title, {
                    body: body,
                    icon: 'https://tms.thedesigns.live/images/tms_logo.jpeg',
                    badge: 'https://tms.thedesigns.live/images/tms_logo.jpeg',
                    tag: 'tms-task-' + Date.now(),
                    data: { url: deepLink },
                    requireInteraction: false,
                }),
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
                    windowClients.forEach(client => {
                        client.postMessage({
                            type: 'BEAMS_PUSH_RECEIVED',
                            title: title,
                            body: body,
                        });
                    });
                }),
            ])
        );
    } catch (e) {
        console.error('[SW] Push parse error:', e);
    }
});