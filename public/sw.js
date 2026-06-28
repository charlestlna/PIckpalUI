const CACHE_NAME = "pickpal-shell-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/pickpal-icon.svg",
  "/icons/pickpal-icon-180.png",
  "/icons/pickpal-icon-192.png",
  "/icons/pickpal-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

const isApiRequest = (request) => {
  const url = new URL(request.url);
  return url.pathname.startsWith("/api/") || url.href.includes("/api/");
};

const isSensitiveRequest = (request) => {
  if (request.method !== "GET") return true;
  const url = new URL(request.url);
  return /\/(votes|login|logout|password|register|voters|official-students)/.test(url.pathname);
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || isApiRequest(request) || isSensitiveRequest(request)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html").then((response) => response || caches.match("/offline.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })),
  );
});
