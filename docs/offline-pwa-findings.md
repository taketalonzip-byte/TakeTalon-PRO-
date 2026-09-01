# Offline PWA findings

## Repository and production snapshot

- Repository: `taketalonzip-byte/TakeTalon-PRO-`, branch `main`, baseline commit `6b56099`.
- Production homepage returned HTTP 200; `/api/health` returned HTTP 200 with `status: ok`, `app: TakeTalon PRO`, and `dbConnected: true`.
- Production homepage response currently has `Cache-Control: public, max-age=0`.

## Current PWA implementation

- `public/sw.js` uses cache name `taketalon-pwa-v1` and precaches `/`, `/manifest.json`, `/icon-192.png`, `/icon-512.png`, and `/apple-touch-icon.png`.
- `public/sw.js` is network-first for same-origin GET requests, excludes `/api/`, caches successful basic responses, and falls back to the cached request or `/` on network failure.
- The Service Worker does not explicitly precache `tt-logo.png`, `tt-logo.webp`, `icon.svg`, `favicon.png`, or built JS/CSS assets. This makes splash/image behavior dependent on prior runtime fetches and can fail in offline-first launches.
- `src/components/Splash.tsx` automatically calls `onComplete()` after 1400 ms regardless of network state; it has no offline gate or retry state.
- `src/components/TalonLogo.tsx` first tries a Supabase Storage URL when `VITE_SUPABASE_URL` is configured, then `/tt-logo.png`, then `/tt-logo.webp`, and finally a Lucide-Zap fallback. This means offline splash may wait on/fail through a remote URL before showing local assets.
- The local `public/tt-logo.png` and `public/tt-logo.webp` inspected as generic `NO IMAGE AVAILABLE` assets, not the intended TakeTalon brand artwork. The existing Splash currently uses `TalonLogo`, so its fallback emblem is the only guaranteed local brand-like rendering.
- `src/main.tsx` registers `/sw.js` after window load only in production, then mounts React immediately.
- `manifest.json` uses `/icon-192.png`, `/icon-512.png`, and `/apple-touch-icon.png`; these should remain part of the install/shell cache.

## Initial implementation direction

- Add an explicit offline splash gate in the React layer that observes `navigator.onLine` and `online`/`offline` events, never calls `onComplete` while offline, and offers a retry action.
- Ensure the splash’s visible logo is local-first and independent of Supabase/network; consider an inline/local fallback and avoid remote-first image loading for this critical UI.
- Make the Service Worker cache versioned, install resiliently, and precache all critical public shell assets plus the built shell URLs where applicable. Keep API requests out of cache and preserve network-first behavior for fresh online data.
- Validate with build/typecheck, `git diff --check`, and production smoke checks after an explicitly confirmed deployment only.

## Production visual check

Production splash briefly rendered the TAKETALON wordmark, but the extracted image source was the remote Supabase URL `https://jrefgmvoosyxxjyhnycx.supabase.co/storage/v1/object/public/esports-images/tt-logo.png`. The clean production screenshot then showed the main app after the splash timer elapsed. This confirms the critical splash logo is currently remote-first and the splash proceeds automatically; the new local-first `icon.svg` path and offline gate directly address both observations.

## Local preview visual check

The built local preview rendered the new bundled `/icon.svg` as the Splash logo, then transitioned to the full app after the normal timer. The page exposed the expected main navigation and live cards, indicating no online runtime break from the patch.

## Offline simulation check

A simulated browser `offline` event on the local production preview changed the root to the new splash state. The DOM contained `TAKETALON`, `You're offline`, the connection guidance, and a `Try again` button; the screenshot showed the bundled logo still visible. This verifies the gate does not let the app continue while offline.

## Online recovery check

After simulating the `online` event, the splash timer completed and the main app returned with its expected login, sport navigation, feed, and bet-slip UI. This verifies the offline gate does not permanently block the online state.

## Final build online check

The final rebuilt local preview showed the Splash with the bundled logo, then returned to the main app with the expected controls and feed. Header and Top Events logo instances also resolved to the repaired valid local `tt-logo.png` asset instead of a broken placeholder.

## Cache-only boot attempt

A cache inventory confirmed an active `taketalon-pwa-v2` worker with `/`, `/icon.svg`, both main JS builds, CSS, manifest, and logo assets present. However, after stopping the local preview process and navigating to the origin, the browser showed a blank page. This test indicates the browser session did not successfully execute a cache-only navigation in this setup (likely because the origin/server itself was unavailable or the page was not controlled at navigation time); it is a follow-up verification item, not a success claim.

## Service Worker control verification

After returning to the running local preview, the browser reported `controller: http://127.0.0.1:4173/sw.js`, active worker `sw.js`, and a `taketalon-pwa-v2` cache containing 32 requests, including root, the main JS bundle, CSS, manifest, icons, and logos. The earlier blank cache-only attempt occurred before confirming control of the navigation.

## Cache-only boot success

After the worker was confirmed as controller, the preview server was stopped and the browser navigated again. The cached root and bundles booted successfully without the server, and the UI showed the local logo plus `You're offline`, guidance, and `Try again`. This is the strongest local verification of the requested offline-first behavior.
