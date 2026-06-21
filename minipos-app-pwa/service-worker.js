// service-worker.js — Mini POS (Paymaster Algeria / RunPay)
// Cache-first app-shell strategy. Bump CACHE_VERSION whenever index.html
// (or any cached asset) changes so clients pick up the new version.

const CACHE_VERSION = "minipos-v1";
const CACHE_NAME = `minipos-cache-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/favicon-16.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("minipos-cache-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache-first for app-shell assets, falling back to network.
// Network requests are cached opportunistically (so subsequent loads work
// fully offline even if something wasn't in the original APP_SHELL list).
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests for our own origin.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached: for navigations, fall back to the app shell.
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return Promise.reject("offline-and-not-cached");
        });
    })
  );
});
