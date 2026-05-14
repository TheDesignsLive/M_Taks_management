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
        const n = payload?.notification || payload?.data;
        if (!n || !n.title) return;

        event.waitUntil(
            self.registration.showNotification(n.title, {
                body:               n.body || '',
                icon:               'https://tms.thedesigns.live/images/tms_logo.jpeg',
                badge:              'https://tms.thedesigns.live/images/tms_logo.jpeg',
                tag:                'tms-' + Date.now(),
                data:               { url: n.deep_link || 'https://m-tms.thedesigns.live' },
                requireInteraction: false,
                silent:             false,
            })
        );
    } catch (e) {}
});