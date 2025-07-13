// Service Worker para Push Notifications
const CACHE_NAME = 'task-app-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/favicon.ico',
  '/manifest.json'
];

// Instalación del service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error during installation:', error);
      })
  );
});

// Activación del service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated successfully');
        return self.clients.claim();
      })
  );
});

// Interceptar requests para cache
self.addEventListener('fetch', (event) => {
  // Solo cachear requests GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si está en cache, devolverlo
        if (response) {
          return response;
        }

        // Si no está en cache, hacer fetch
        return fetch(event.request)
          .then((response) => {
            // No cachear responses que no son exitosas
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la response para cachearla
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
      .catch(() => {
        // Fallback para requests que fallan
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Manejar push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  let notificationData = {
    title: 'Nueva Notificación',
    body: 'Tienes una nueva notificación',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'task-app-notification',
    requireInteraction: false,
    data: {}
  };

  // Si hay datos en el push
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        data: data
      };
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title,
      notificationData
    )
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'open') {
    // Abrir la aplicación
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Si ya hay una ventana abierta, enfocarla
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Si no hay ventana abierta, abrir una nueva
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

// Manejar cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Message received from client:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 