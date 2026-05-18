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

    event.waitUntil(
        (async () => {
            try {
                const payload = event.data.json();
                
                // 1. Backend se aayi hui sender_id nikalo
                const senderId = payload?.data?.sender_id;

                // 2. Apni stored ID Cache se nikalo (Jo App.jsx ne rakhi thi)
                const cache = await caches.open('tms-user-data');
                const cachedResponse = await cache.match('/my-id');
                const myId = cachedResponse ? await cachedResponse.text() : null;

                // 3. ✅ SELF-NOTIFICATION FILTER
                if (senderId && myId && senderId === myId) {
                    console.log('[SW] Self-notification blocked for:', myId);
                    return; 
                }

                // --- Baki ka notification logic wahi purana ---
                const n = payload?.notification || payload?.data?.notification || payload?.aps?.alert || null;
                const title = n?.title || payload?.title || payload?.data?.title || 'TMS Workspace';
                const body  = n?.body  || payload?.body  || payload?.data?.body  || '';
                const deepLink = payload?.data?.url || payload?.data?.deep_link || 'https://m-tms.thedesigns.live';

                if (!title) return;

                await self.registration.showNotification(title, {
                    body: body,
                    icon: 'https://tms.thedesigns.live/images/tms_logo.jpeg',
                    badge: 'https://tms.thedesigns.live/images/tms_logo.jpeg',
                    tag: 'tms-task-' + Date.now(),
                    data: { url: deepLink },
                    requireInteraction: false,
                });

                // In-app message bhejna (same as before)
                const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
                windowClients.forEach(client => {
                    client.postMessage({
                        type: 'BEAMS_PUSH_RECEIVED',
                        title: title,
                        body: body,
                    });
                });

            } catch (e) {
                console.error('[SW] Push error:', e);
            }
        })()
    );
});