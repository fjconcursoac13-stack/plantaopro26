// Service Worker for Push Notifications
const CACHE_NAME = 'plantao-pro-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Você tem uma nova notificação',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'view', title: 'Ver Detalhes' },
      { action: 'close', title: 'Fechar' }
    ],
    requireInteraction: true,
    tag: 'shift-alert'
  };

  event.waitUntil(
    self.registration.showNotification('Plantão Pro', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If there's already a window open, focus it
        for (const client of clientList) {
          if (client.url.includes('/agent-panel') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/agent-panel');
        }
      })
    );
  }
});

