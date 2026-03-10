const CACHE_NAME = "homebase-v1";
const SHELL_URLS = ["/dashboard", "/tasks", "/calendar", "/settings"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Network-first for API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Cache-first for app shell and static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cache but also update in background
        fetch(request)
          .then((response) => {
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, response));
          })
          .catch(() => {
            /* offline — stale cache is fine */
          });
        return cached;
      }

      // Not in cache — fetch from network and cache
      return fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (!response || response.status !== 200) {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback: return cached dashboard page for navigation requests
          if (request.mode === "navigate") {
            return caches.match("/dashboard");
          }
          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
    }),
  );
});
