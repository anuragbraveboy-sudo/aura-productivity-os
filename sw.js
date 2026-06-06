const CACHE_NAME = 'aura-v2.0.33';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './ai.js',
  './bridge.js',
  './db.js',
  './particles.js',
  './sounds.js',
  './manifest.json'
];

// Install — pre-cache all core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first during development, cache as fallback
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and external API calls
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Update cache with fresh response
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(e.request).then((cached) => {
          if (cached) return cached;
          if (e.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
