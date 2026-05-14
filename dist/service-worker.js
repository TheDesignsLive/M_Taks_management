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