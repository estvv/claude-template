/*
 * Service worker.
 *
 * Caching policy, deliberately narrow:
 *
 *   - Build assets under /_next/static and the app icons are content-hashed or
 *     stable, so they are cache-first and safe to keep.
 *   - Everything else — pages, server actions, /api/* — is network-only and is
 *     NEVER written to the cache. Those responses are per-user (a group's
 *     karma, someone's proof photo); storing them would leave private content
 *     on the device, readable by whoever opens the app next.
 *   - Failed navigations fall back to a static offline page rather than a
 *     stale copy of a real one: every number in this app changes constantly,
 *     so showing an outdated dashboard would be worse than showing nothing.
 *
 * Bump CACHE_VERSION whenever this policy changes; `activate` drops every
 * cache that doesn't match, which is what stops old builds from piling up on
 * users' devices forever.
 */
const CACHE_VERSION = "v2";
const CACHE_NAME = `unlocked-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Immutable build output and icons — the only things worth keeping. */
function isCacheableAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/"))
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            // Only store complete, successful responses.
            if (response.ok && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Navigations: always go to the network, fall back to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Everything else (API routes, uploads, data requests) is left alone — no
  // interception, no cache.
});
