// VJP Life Planner service worker: makes the app installable and open offline.
// Pages: network first, cached copy when offline. Hashed build files: cache first. Google Sheet calls are never cached.
const CACHE = "lp-v1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./icon-192.png"])).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url); if (url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put("./index.html", c)); return r; }).catch(() => caches.match("./index.html")));
    return;
  }
  if (url.pathname.includes("/assets/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); } return r; })));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => { const net = fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); } return r; }).catch(() => hit); return hit || net; }));
});
