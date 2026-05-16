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
        // Beams sends FCM payload — title/body can be in multiple locations
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
                // 1. Always show the OS notification (works when app is background/closed)
                self.registration.showNotification(title, {
                    body: body,
                    icon: 'https://tms.thedesigns.live/images/tms_logo.jpeg',
                    badge: 'https://tms.thedesigns.live/images/tms_logo.jpeg',
                    tag: 'tms-task-' + Date.now(),
                    data: { url: deepLink },
                    requireInteraction: false,
                }),
                // 2. Also forward to open windows for in-app toast
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
    } catch (e) {}
});