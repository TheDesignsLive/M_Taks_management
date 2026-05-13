importScripts("https://js.pusher.com/beams/service-worker.js");

PusherBeams.onMessageReceived = (payload) => {
  console.log("Background Notification Received:", payload);
};