// Minimal service worker: only exists to satisfy PWA installability
// criteria (Chrome requires a registered SW with a fetch handler) and
// give a basic offline fallback. Network-first, falls back to cache
// when offline — no aggressive caching, since most content here is
// dynamic (SSR pages, API routes).
const CACHE_NAME = "unlocked-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
