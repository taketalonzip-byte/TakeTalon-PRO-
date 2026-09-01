# TakeTalon Offline Logo Fix Findings

## Audit

The existing Splash rendered `TalonLogo` with `localFirst`, but the first local source was `/icon.svg`. The deployed v2 worker did cache `/icon.svg` and the related logo files, yet the SVG's original coordinate transforms placed the double-T mark outside the 512 by 512 viewBox, which could appear as a blank or broken-looking logo even when the request succeeded. Production inspection also confirmed the active v2 worker had a cached SVG response with HTTP 200 and `image/svg+xml` content type.

## Fix plan

The Splash now starts with `/icon-512.png`, a verified local TakeTalon mark, followed by `/tt-logo.png`, `/tt-logo.webp`, and `/icon.svg`; if all image elements fail, it renders an inline SVG mark without any network request. The Service Worker cache was bumped to `taketalon-pwa-v3` and the four splash assets are an explicit mandatory precache set. The offline card copy and Try again button were not changed.

## Local visual check

The rebuilt local preview rendered the expected TakeTalon double-T mark from `/icon-512.png` in the Splash before transitioning to the existing online app UI.

## Local v3 verification

The local preview activated `http://127.0.0.1:4173/sw.js` with `taketalon-pwa-v3`; cache lookup returned HTTP 200 for `/icon-512.png` (`image/png`) and `/icon.svg`. Simulating the offline event rendered `/icon-512.png` in the Splash, preserved the exact `You're offline` card and `Try again` button, and showed the complete double-T mark rather than a broken image.
