const CACHE_NAME = "taketalon-pwa-v5";
const BRAND_CACHE_NAME = "taketalon-brand-assets-v1";
const BRAND_LOGO_CACHE_KEY = "/__taketalon__/brand-logo.png";
const DEFAULT_BRAND_LOGO_URL =
  "https://jrefgmvoosyxxjyhnycx.supabase.co/storage/v1/object/public/esports-images/tt-logo.png";

// These are the actual TakeTalon logo files. The Service Worker installs them
// locally so the offline Splash never needs to request a remote image.
const SPLASH_ASSETS = ["/tt-logo.png", "/tt-logo.webp"];

const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.png",
  "/favicon.ico",
  ...SPLASH_ASSETS,
];

function isBrandLogoRequest(url) {
  return (
    url.href === DEFAULT_BRAND_LOGO_URL ||
    (url.hostname.endsWith(".supabase.co") &&
      url.pathname === "/storage/v1/object/public/esports-images/tt-logo.png")
  );
}

async function notifyLogoCached() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: "TAKETALON_LOGO_CACHED" }));
}

async function cacheRemoteBrandLogo(url = DEFAULT_BRAND_LOGO_URL) {
  const brandCache = await caches.open(BRAND_CACHE_NAME);
  const response = await fetch(url, {
    cache: "reload",
    credentials: "omit",
    mode: "cors",
  });

  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error(`Unable to cache TakeTalon logo: ${response.status}`);
  }

  await brandCache.put(BRAND_LOGO_CACHE_KEY, response.clone());
  await brandCache.put(url, response.clone());
  await notifyLogoCached();
  return response;
}

async function seedLocalBrandLogo() {
  const brandCache = await caches.open(BRAND_CACHE_NAME);
  const localLogo = await caches.match("/tt-logo.png");
  if (localLogo) {
    await brandCache.put(BRAND_LOGO_CACHE_KEY, localLogo.clone());
  }
}

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

  // If a critical shell asset is missing, do not claim control with a broken app.
  await cache.addAll(assetsToCache);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await precacheAppShell();
      // The local copy guarantees first install resilience; the online message
      // and the logo fetch interception replace it with the real Supabase object.
      await seedLocalBrandLogo();
      try {
        await cacheRemoteBrandLogo();
      } catch {
        // Keep the verified local copy if Supabase is temporarily unavailable.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== BRAND_CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data?.type !== "CACHE_TAKETALON_LOGO") return;

  const requestedUrl = typeof data.url === "string" ? data.url : DEFAULT_BRAND_LOGO_URL;
  if (!/^https:\/\//i.test(requestedUrl)) return;

  event.waitUntil(
    cacheRemoteBrandLogo(requestedUrl).catch(() => {
      // A previously cached logo remains the offline source of truth.
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Supabase's public logo is cache-first once the worker has warmed it online.
  if (request.method === "GET" && isBrandLogoRequest(url)) {
    event.respondWith(
      caches.open(BRAND_CACHE_NAME).then(async (brandCache) => {
        const cached =
          (await brandCache.match(request)) ||
          (await brandCache.match(BRAND_LOGO_CACHE_KEY));
        if (cached) return cached;

        // Never start a Supabase request from an offline client.
        if (self.navigator && self.navigator.onLine === false) {
          return (await caches.match("/tt-logo.png")) || Response.error();
        }

        try {
          return await cacheRemoteBrandLogo(url.href);
        } catch {
          return (await caches.match("/tt-logo.png")) || Response.error();
        }
      }),
    );
    return;
  }

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never cache live API responses: odds, fixtures, auth, and wallet data stay fresh.
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

        // Only navigations may fall back to the cached document. Returning HTML
        // for missing JS/CSS would create the broken-component state we avoid.
        if (request.mode === "navigate") {
          return (await caches.match("/")) || Response.error();
        }

        return Response.error();
      }),
  );
});
