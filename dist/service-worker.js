// public/service-worker.js — Mobile version
importScripts('https://js.pusher.com/beams/service-worker.js');

const MOBILE_BASE = 'https://m-tms.thedesigns.live';
const DESKTOP_BASE = 'https://tms.thedesigns.live';

// ✅ Show notification when app IS open (foreground)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
        const payload = event.data.json();

        // Beams sends { notification: { title, body, deep_link }, data: { ... } }
        const n = payload?.notification || payload?.data;
        if (!n || !n.title) return;

        const url = n.deep_link || n.url || `${MOBILE_BASE}/home`;

        event.waitUntil(
            self.registration.showNotification(n.title, {
                body: n.body || '',
                // ✅ Use desktop server for logo — it's always accessible
                icon: `${DESKTOP_BASE}/images/tms_logo.jpeg`,
                badge: `${DESKTOP_BASE}/images/tms_logo.jpeg`,
                image: `${DESKTOP_BASE}/images/tms_logo.jpeg`,
                data: { url },
                requireInteraction: false,
                silent: false,
                // ✅ vibrate helps Android show it even in background
                vibrate: [200, 100, 200],
            })
        );
    } catch (e) {
        // Beams handles its own FCM format — let it fall through
    }
});

// ✅ Handle notification tap — open or focus app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = (event.notification.data && event.notification.data.url)
              || `${MOBILE_BASE}/home`;

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