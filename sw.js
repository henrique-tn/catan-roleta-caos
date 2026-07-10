// Chaos Wheel service worker: cache-first so the table works offline (basement-proof).
// Bump the version to ship updates.
const CACHE = "catan-wheel-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./roleta-catan.html",
  "./manifest.json",
  "./og-image.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        // runtime-cache same-origin files and the Google Fonts css/woff2
        const url = e.request.url;
        const cacheable = res.ok && (url.startsWith(self.location.origin) ||
          url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com"));
        if (cacheable) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match("./roleta-catan.html"));
    })
  );
});
