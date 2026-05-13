// public/service-worker.js — Mobile version NEW FILE
importScripts('https://js.pusher.com/beams/service-worker.js');

// Force show notification when app tab IS open
self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
        const payload = event.data.json();
        const notification = payload?.notification || payload?.data;
        if (!notification || !notification.title) return;

        event.waitUntil(
            self.registration.showNotification(notification.title, {
                body: notification.body || '',
                icon: 'https://m-tms.thedesigns.live/images/tms_logo.jpeg',
                badge: 'https://m-tms.thedesigns.live/images/tms_logo.jpeg',
                data: { url: notification.deep_link || 'https://m-tms.thedesigns.live/home' },
                requireInteraction: false,
                silent: false,
            })
        );
    } catch (e) {
        // Beams handles its own format
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url)
              || 'https://m-tms.thedesigns.live/home';

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