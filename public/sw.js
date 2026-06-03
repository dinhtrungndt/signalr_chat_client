// public/sw.js
self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    console.log('[Service Worker] Push Received.', data);

    const options = {
      body: data.body,
      icon: '/icon_192.png',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  // Khi người dùng click vào thông báo, mở link của ứng dụng
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function (clientList) {
      const urlToOpen = event.notification.data.url || '/';

      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
