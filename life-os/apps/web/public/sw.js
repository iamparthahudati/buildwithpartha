/* Service Worker for LifeOS static app shell caching (LOS-1315) */

const CACHE_VERSION = "lifeos-shell-v1";
const STATIC_CACHE_PREFIX = "lifeos-shell-";

// Core static app shell resources to cache on install
const APP_SHELL_RESOURCES = ["./", "index.html", "favicon.png"];

// Helper to determine if a URL is an API request
function isApiRequest(url) {
  return url.pathname.includes("/api/");
}

// Helper to determine if a request is for static assets or navigation
function isNavigationRequest(request) {
  return request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(APP_SHELL_RESOURCES).catch((err) => {
        // Log warning if some assets fail to precache, but don't fail SW install
        console.warn("Failed to precache some app shell resources:", err);
      });
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith(STATIC_CACHE_PREFIX) && name !== CACHE_VERSION)
            .map((name) => caches.delete(name)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Security Rule: NEVER cache private API responses or non-GET requests
  if (isApiRequest(url) || request.method !== "GET") {
    return;
  }

  // Handle SPA navigation requests with Network-First, falling back to cached index.html
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedIndex =
            (await caches.match("index.html")) ||
            (await caches.match("./")) ||
            (await caches.match(request));
          if (cachedIndex) {
            return cachedIndex;
          }
          return new Response("Offline - LifeOS App Shell Unavailable", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        }),
    );
    return;
  }

  // Handle fingerprinted static assets (JS, CSS, images, fonts) with Cache-First / Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for static assets
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {
            // Ignore background fetch failure when offline
          });
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse.status === 200 && request.method === "GET") {
          const copy = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
