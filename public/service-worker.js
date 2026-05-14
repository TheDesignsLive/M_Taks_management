// public/service-worker.js — Mobile version
importScripts('https://js.pusher.com/beams/service-worker.js');

// ✅ Beams handles background (app closed) push automatically via importScripts above
// This push listener handles FOREGROUND (app open) — shows notification that browsers suppress

self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
        const payload = event.data.json();

        // Beams wraps payload inside notification or data key
        const n = payload?.notification || payload?.data;
        if (!n || !n.title) return;

        const url = n.deep_link || n.url || 'https://m-tms.thedesigns.live/home';

        // ✅ icon must point to desktop server — mobile server images folder
        // is same physical folder, but desktop URL is always reachable by FCM/browser
        const icon = 'https://tms.thedesigns.live/images/tms_logo.jpeg';

        event.waitUntil(
            self.registration.showNotification(n.title, {
                body: n.body || '',
                icon: icon,
                badge: icon,
                tag: 'tms-notification',          // ✅ replaces old notification instead of stacking
                renotify: true,                   // ✅ still vibrate/sound even if same tag
                data: { url: url },
                requireInteraction: false,
                silent: false,
                vibrate: [300, 100, 300],         // ✅ forces sound+vibrate on Android
            })
        );
    } catch (e) {
        // Beams handles its own FCM format — ignore parse errors here
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

// ✅ Take control immediately — no waiting for old SW to die
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));