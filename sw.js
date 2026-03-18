/* ============================================
   JERRY AI — Service Worker
   Enables offline support & PWA installability
   ============================================ */

const CACHE_NAME = 'jerry-ai-v1.0.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/commands.html',
  '/settings.html',
  '/index.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── Install: Cache core assets ───
self.addEventListener('install', (event) => {
  console.log('[Jerry SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Jerry SW] Caching core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.log('[Jerry SW] Cache failed (offline assets will load on next visit):', err);
    })
  );
  self.skipWaiting();
});

// ─── Activate: Clean old caches ───
self.addEventListener('activate', (event) => {
  console.log('[Jerry SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[Jerry SW] Removing old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch: Network-first with cache fallback ───
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and WebSocket
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('ws://') || event.request.url.includes('wss://')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache the response
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Return cached version if offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;

          // Fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }

          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
