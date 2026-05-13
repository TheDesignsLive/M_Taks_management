importScripts("https://js.pusher.com/beams/service-worker.js");

// 🔔 PUSH EVENT (APP CLOSED MEIN KAAM AYEGA)
self.addEventListener("push", function (event) {
    let data = {};

    if (event.data) {
        data = event.data.json();
    }

    const title = data.title || "TMS Notification";
    const options = {
        body: data.body || "New update received",
        icon: "/images/tms_logo.jpeg",
        badge: "/images/tms_logo.jpeg",
        vibrate: [200, 100, 200],
        data: {
            url: data.deep_link || "/"
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 🔗 CLICK OPEN APP
self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});