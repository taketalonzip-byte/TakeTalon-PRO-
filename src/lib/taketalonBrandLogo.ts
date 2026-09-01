const SUPABASE_URL_FALLBACK = "https://jrefgmvoosyxxjyhnycx.supabase.co";

const configuredSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK)
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/+$/, "");

export const TAKETALON_BRAND_CACHE = "taketalon-brand-assets-v1";
export const TAKETALON_BRAND_CACHE_KEY = "/__taketalon__/brand-logo.png";
export const TAKETALON_BRAND_LOGO_URL = `${configuredSupabaseUrl}/storage/v1/object/public/esports-images/tt-logo.png`;

export type CacheTaketalonLogoMessage = {
  type: "CACHE_TAKETALON_LOGO";
  url: string;
};

/**
 * Reads the already-cached Supabase logo as a blob URL.
 * This function never performs a network request.
 */
export async function readCachedTaketalonLogo(): Promise<string | null> {
  if (typeof window === "undefined" || !("caches" in window)) return null;

  try {
    const cacheNames = await window.caches.keys();
    const cacheOrder = [
      TAKETALON_BRAND_CACHE,
      ...cacheNames.filter((name) => name.startsWith("taketalon-pwa-")),
    ];
    const candidates = [TAKETALON_BRAND_CACHE_KEY, "/tt-logo.png", "/tt-logo.webp"];

    for (const cacheName of [...new Set(cacheOrder)]) {
      const cache = await window.caches.open(cacheName);
      for (const candidate of candidates) {
        const response = await cache.match(candidate);
        if (!response || !response.ok) continue;

        const blob = await response.blob();
        if (blob.size) return URL.createObjectURL(blob);
      }
    }
  } catch {
    // Offline UI must remain deterministic; a cache miss is handled by the caller.
  }

  return null;
}

/**
 * Asks the active Service Worker to perform the online-only brand warm-up.
 * No message is sent while the browser reports an offline state.
 */
export function requestTaketalonLogoWarmup(url: string): void {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  if (!/^https:\/\//i.test(url)) return;

  const message: CacheTaketalonLogoMessage = {
    type: "CACHE_TAKETALON_LOGO",
    url,
  };
  const worker = navigator.serviceWorker?.controller;

  if (worker) {
    worker.postMessage(message);
    return;
  }

  void navigator.serviceWorker?.ready.then((registration) => {
    registration.active?.postMessage(message);
  });
}
