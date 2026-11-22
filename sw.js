/* =========================================================
   STEMPELUHR & WOCHENÜBERSICHT — SERVICE WORKER (v2.0.1)
   Offline-Cache für App-Shell, Favicons & jsPDF
   ========================================================= */
const APP_VERSION = "2.0.1";
const CACHE_NAME = `stempeluhr-cache-v${APP_VERSION}`;

const CORE_ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.json",
    "./manifest-rose.json",
    "./favicon_192.png",
    "./favicon_512.png",
    "./favicon_rose_192.png",
    "./favicon_rose_512.png",
    "./jspdf.umd.min.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            await Promise.allSettled(
                CORE_ASSETS.map((url) =>
                    cache.add(new Request(url, { cache: "reload" })).catch(() => null)
                )
            );
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key.startsWith("stempeluhr-cache-") && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Navigationen: Network-First mit sicherem Cache-Fallback für Offline-Start
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((c) => c.put("./index.html", copy));
                    }
                    return res;
                })
                .catch(() => caches.match("./index.html"))
        );
        return;
    }

    // Statische App-Dateien: Cache-First + Hintergrund-Aktualisierung
    event.respondWith(
        caches.match(req, { ignoreSearch: true }).then((cached) => {
            const networkFetch = fetch(req)
                .then((res) => {
                    if (res && res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached);

            return cached || networkFetch;
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
            for (const client of clientsArr) {
                if ("focus" in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow("./index.html");
        })
    );
});