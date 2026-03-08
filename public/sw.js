// Service worker for web push (PWA). Push events are handled here.
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "PawCast";
  const options = {
    body: data.body ?? "",
    icon: data.icon ?? "/icon-192.png",
    data: { url: data.url ?? "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});
