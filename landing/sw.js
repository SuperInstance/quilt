// Quilt PWA Service Worker
// Caches the entire site for offline use. Network-first for HTML, cache-first for assets.

const CACHE_VERSION = 'quilt-v1';
const CORE_ASSETS = [
  '/quilt/landing/',
  '/quilt/landing/index.html',
  '/quilt/landing/quilt-live.html',
  '/quilt/landing/studio.html',
  '/quilt/landing/showcase.html',
  '/quilt/landing/docs.html',
  '/quilt/landing/tutorial.html',
  '/quilt/landing/gallery.html',
  '/quilt/landing/timeline.html',
  '/quilt/landing/ide.html',
  '/quilt/landing/synoptic.html',
  '/quilt/landing/synoptic3d.html',
  '/quilt/landing/patterns.html',
  '/quilt/landing/playground.html',
  '/quilt/landing/compare.html',
  '/quilt/landing/cells.html',
  '/quilt/landing/start.html',
  '/quilt/landing/about.html',
  '/quilt/landing/quilt-time.html',
  '/quilt/landing/quilt-vault.html',
  '/quilt/landing/quilt-mesh.html',
  '/quilt/landing/quilt-zk.html',
  '/quilt/landing/quilt-vision.html',
  '/quilt/landing/quilt-agent.html',
  '/quilt/landing/quilt-esp32.html',
  '/quilt/landing/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Only handle same-origin requests
  if (url.origin !== self.location.origin && !url.hostname.includes('github.io')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/quilt/landing/index.html')))
  );
});
