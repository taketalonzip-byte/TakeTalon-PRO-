const CACHE_NAME = "taketalon-pwa-v2";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.png",
  "/favicon.ico",
  "/tt-logo.png",
  "/tt-logo.webp",
];

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const shellResponse = await fetch("/", { cache: "reload" });

  if (!shellResponse.ok) {
    throw new Error(`Unable to precache app shell: ${shellResponse.status}`);
  }

  await cache.put("/", shellResponse.clone());

  const html = await shellResponse.text();
  const buildAssets = [
    ...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g),
  ].map((match) => match[1]);
  const assetsToCache = [
    ...new Set([...APP_SHELL.filter((asset) => asset !== "/"), ...buildAssets]),
  ];

  // These are critical shell assets. If any is unavailable, installation must fail
  // rather than claiming control with an offline shell that cannot boot.
  await cache.addAll(assetsToCache);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
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
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache live API responses: odds, fixtures, auth, and wallet data must stay fresh.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)),
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        // Only navigations may fall back to the cached document. Returning HTML for
        // a missing JS/CSS asset creates the broken-component state this worker avoids.
        if (request.mode === "navigate") {
          return (await caches.match("/")) || Response.error();
        }

        return Response.error();
      }),
  );
});
