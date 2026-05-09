// ===== ادبل Service Worker =====

const CACHE_VERSION = 'adpl-v-20260509-2';

const STATIC_CACHE  = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';

const STATIC_ASSETS = [
  './',
  './index.html',
  './home.html',
  './login.html',
  './ride.html',
  './favicon.png',
  './manifest.json'
];

// INSTALL
self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
});

// ACTIVATE
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {

    const keys = await caches.keys();

    await Promise.all(
      keys.map((key) => {
        if (
          key !== STATIC_CACHE &&
          key !== RUNTIME_CACHE
        ) {
          return caches.delete(key);
        }
      })
    );

    await self.clients.claim();

  })());
});

// FETCH
self.addEventListener('fetch', (event) => {

  const req = event.request;

  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // تجاهل Firebase
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic')
  ) {
    return;
  }

  // صفحات HTML → Network First
  if (
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html')
  ) {

    event.respondWith((async () => {

      try {

        const fresh = await fetch(req, {
          cache: 'no-store'
        });

        const cache = await caches.open(RUNTIME_CACHE);

        cache.put(req, fresh.clone());

        return fresh;

      } catch (e) {

        const cached = await caches.match(req);

        return cached || caches.match('./home.html');

      }

    })());

    return;
  }

  // ملفات CSS / JS / Images
  event.respondWith((async () => {

    const cached = await caches.match(req);

    if (cached) return cached;

    try {

      const fresh = await fetch(req);

      const cache = await caches.open(RUNTIME_CACHE);

      cache.put(req, fresh.clone());

      return fresh;

    } catch (e) {

      return cached;

    }

  })());

});
