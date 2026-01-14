// Service Worker for Push Notifications & Offline Cache - Plantão Pro
const CACHE_NAME = 'plantao-pro-v3';
const STATIC_CACHE = 'plantao-pro-static-v3';
const DYNAMIC_CACHE = 'plantao-pro-dynamic-v3';

const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// URLs to cache for offline access
const CACHEABLE_ROUTES = [
  '/dashboard',
  '/agent-panel',
  '/settings',
  '/install'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v3...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('[SW] Some static assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v3...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => 
            name !== STATIC_CACHE && 
            name !== DYNAMIC_CACHE &&
            name !== CACHE_NAME
          )
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Fetch event - Network first with fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle API requests (Supabase) - Network first with cache fallback
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle same-origin requests - Cache first for static, network first for dynamic
  if (url.origin === self.location.origin) {
    // Static assets - Cache first
    if (isStaticAsset(url.pathname)) {
      event.respondWith(cacheFirst(request));
    } else {
      // Dynamic content - Network first
      event.respondWith(networkFirst(request));
    }
    return;
  }
});

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Cache first strategy (for static assets)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network first strategy (for dynamic content)
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/');
      if (offlinePage) return offlinePage;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Handle API requests with smart caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = `api:${url.pathname}${url.search}`;
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful GET requests
    if (networkResponse.ok && request.method === 'GET') {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(DYNAMIC_CACHE);
      
      // Create a response with timestamp header
      const responseBody = await responseClone.text();
      const cachedResponse = new Response(responseBody, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: {
          ...Object.fromEntries(networkResponse.headers),
          'x-cached-at': new Date().toISOString()
        }
      });
      
      cache.put(cacheKey, cachedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] API request failed, checking cache:', cacheKey);
    
    const cachedResponse = await caches.match(cacheKey);
    if (cachedResponse) {
      console.log('[SW] Returning cached API response');
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'Plantão Pro',
    body: 'Você tem uma nova notificação',
    icon: '/icon-192.png',
    badge: '/favicon.ico',
    tag: 'default',
    url: '/agent-panel'
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/agent-panel',
      type: data.type || 'general'
    },
    actions: getActionsForType(data.type),
    requireInteraction: true,
    tag: data.tag || 'plantao-pro-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Get appropriate actions based on notification type
function getActionsForType(type) {
  switch (type) {
    case 'birthday':
      return [
        { action: 'view', title: '🎉 Ver Perfil' },
        { action: 'close', title: 'Fechar' }
      ];
    case 'shift':
      return [
        { action: 'view', title: '📋 Ver Plantão' },
        { action: 'close', title: 'Fechar' }
      ];
    case 'shift-reminder':
      return [
        { action: 'view', title: '⏰ Ver Detalhes' },
        { action: 'close', title: 'Fechar' }
      ];
    default:
      return [
        { action: 'view', title: 'Ver' },
        { action: 'close', title: 'Fechar' }
      ];
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/agent-panel';

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(url);
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// Periodic sync for background checks (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNotifications());
  }
  if (event.tag === 'sync-data') {
    event.waitUntil(syncCachedData());
  }
});

async function checkForNotifications() {
  console.log('[SW] Checking for notifications...');
}

async function syncCachedData() {
  console.log('[SW] Syncing cached data...');
  // This would sync any pending offline changes
}

// Background sync for pending offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-pending-changes') {
    event.waitUntil(syncPendingChanges());
  }
});

async function syncPendingChanges() {
  console.log('[SW] Syncing pending changes...');
  // Notify clients that we're syncing
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_STARTED' });
  });
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, url, notificationType } = event.data;
    
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: tag || 'message-notification',
      data: { url: url || '/agent-panel', type: notificationType },
      actions: getActionsForType(notificationType),
      requireInteraction: true,
      renotify: true
    });
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
});
