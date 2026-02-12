/// <reference lib="webworker" />

const CACHE_VERSION = "v1";
const STATIC_CACHE = `p2p-static-${CACHE_VERSION}`;
const API_CACHE = `p2p-api-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/schedule",
  "/live",
  "/telemetry",
  "/compare",
  "/history",
  "/offline",
];

// ---------- Install ----------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ---------- Activate ----------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---------- Fetch ----------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Strategy: Network Only — OpenF1 (live data must be fresh)
  if (url.hostname === "api.openf1.org") {
    return; // Let the browser handle it normally
  }

  // Strategy: Stale While Revalidate — Jolpica (historical data)
  if (url.hostname === "api.jolpi.ca") {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // Strategy: Cache First — Static assets (images, flags, logos, icons)
  if (
    url.pathname.startsWith("/drivers/") ||
    url.pathname.startsWith("/flags/") ||
    url.pathname.startsWith("/logos/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy: Cache First + Offline Fallback — App shell
  if (
    request.destination === "document" ||
    request.destination === "script" ||
    request.destination === "style" ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(networkFirstWithOfflineFallback(request, STATIC_CACHE));
    return;
  }

  // Default: Network first for everything else
  event.respondWith(networkFirstWithOfflineFallback(request, STATIC_CACHE));
});

// ---------- Strategies ----------

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 408 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

async function networkFirstWithOfflineFallback(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For document requests, show offline page
    if (request.destination === "document") {
      const offlinePage = await caches.match("/offline");
      if (offlinePage) return offlinePage;
    }

    return new Response("", { status: 408 });
  }
}
