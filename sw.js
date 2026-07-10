// Chaos Wheel service worker.
// Navigations are network-first (users always get the latest HTML when online;
// cache is the offline fallback). Static assets are cache-first.
// Bump CACHE when the asset list changes.
const CACHE = "catan-wheel-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./roleta-catan.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      // bypass the HTTP cache so a version bump can't precache 10-minute-old files
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
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

  // pages: network-first, cache as we go, fall back to cache when offline
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() =>
        caches.match(e.request).then(hit => hit || caches.match("./roleta-catan.html"))
      )
    );
    return;
  }

  // assets: cache-first; runtime-cache same-origin files and Google Fonts
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        const url = e.request.url;
        const cacheable = res.ok && (url.startsWith(self.location.origin) ||
          url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com"));
        if (cacheable) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
