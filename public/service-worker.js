// public/service-worker.js — Mobile version

importScripts('https://js.pusher.com/beams/service-worker.js');

// Forward push payload to open app windows (foreground in-app toast)
// Beams itself handles background notifications automatically.
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const payload = event.data.json();

        const n =
            payload?.notification ||
            payload?.data?.notification ||
            payload?.data;

        if (!n || !n.title) return;

        // Send message to open app windows
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients) => {

            windowClients.forEach((client) => {

                if (client.url.includes('m-tms.thedesigns.live')) {

                    client.postMessage({
                        type: 'BEAMS_PUSH_RECEIVED',
                        title: n.title,
                        body: n.body || '',
                    });

                }

            });

        });

    } catch (e) {
        console.log(e);
    }
});

self.addEventListener('notificationclick', (event) => {

    event.notification.close();

    const url =
        (event.notification.data && event.notification.data.url) ||
        'https://m-tms.thedesigns.live';

    event.waitUntil(

        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients) => {

            for (let i = 0; i < windowClients.length; i++) {

                const client = windowClients[i];

                if (
                    client.url.includes('m-tms.thedesigns.live') &&
                    'focus' in client
                ) {

                    return client.focus().then(() => {

                        if ('navigate' in client) {
                            return client.navigate(url);
                        }

                    });

                }

            }

            if (clients.openWindow) {
                return clients.openWindow(url);
            }

        })

    );

});

// Activate immediately
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});