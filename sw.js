const CACHE_NAME = "stempeluhr-v2.0.0";
const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=200",
  "./app.js?v=200",
  "./manifest.json",
  "./manifest-rose.json",
  "./favicon.png",
  "./favicon_32.png",
  "./favicon_180.png",
  "./favicon_192.png",
  "./favicon_512.png",
  "./favicon_rose_32.png",
  "./favicon_rose_180.png",
  "./favicon_rose_192.png",
  "./favicon_rose_512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(ASSETS);
      // jsPDF separat cachen, damit ein kurzzeitiger CDN-Fehler die SW-Installation nicht blockiert
      try {
        const pdfResp = await fetch(JSPDF_URL, { mode: "cors", cache: "reload" });
        if (pdfResp && pdfResp.ok) {
          await cache.put(JSPDF_URL, pdfResp);
        }
      } catch (err) {}
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: false }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && (response.type === "basic" || response.type === "cors")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("", { status: 503, statusText: "Offline" });
      });
    })
  );
});