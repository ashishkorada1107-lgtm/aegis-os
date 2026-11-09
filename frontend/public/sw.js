const CACHE = "aegis-v1";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

const put = (req, res) => {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.includes("hot-update") ||
    url.pathname.startsWith("/ws") ||
    url.pathname.includes("sockjs")
  )
    return;
  const isFont = /fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (url.origin !== self.location.origin && !isFont) return;
  if (isFont) {
    e.respondWith(
      caches.match(req).then((m) => m || fetch(req).then((r) => put(req, r))),
    );
    return;
  }
  e.respondWith(
    fetch(req)
      .then((r) => put(req, r))
      .catch(() =>
        caches
          .match(req)
          .then(
            (m) =>
              m ||
              (req.mode === "navigate"
                ? caches.match("/index.html")
                : Response.error()),
          ),
      ),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients
      .matchAll({ type: "window" })
      .then((cs) => (cs[0] ? cs[0].focus() : self.clients.openWindow("/"))),
  );
});
