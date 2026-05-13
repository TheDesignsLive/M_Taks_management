// public/service-worker.js
importScripts("https://js.pusher.com/beams/service-worker.js");

// ✅ CLICK HANDLE (jab user notification pe click kare)
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/')
    );
});