# TakeTalon — Current-State Migration Audit

**Audit date:** 2026-09-11  
**Repository:** `taketalonzip-byte/TakeTalon-PRO-`  
**Repository HEAD audited:** `aa57ed1` (`feat: move admin reconciliation fallback to Cloudflare`)  
**Supabase project:** `jrefgmvoosyxxjyhnycx` (`TakeTalon`)

## Executive finding

The migration is active and partially serving through Cloudflare Pages Functions. The public Pages deployment returned HTTP 200 for the application, `robots.txt`, and `sitemap.xml`; `/api/health` reported `dbConnected: true` and `backend: cloudflare-pages-function`; and `/api/cloudflare/supabase-status` reported `ONLINE`. Cloudflare project inspection now confirms the production Pages project is GitHub-connected to `taketalonzip-byte/TakeTalon-PRO-`, deploys from `main`, and its latest successful deployment is commit `97799894c2a59b14d22ac4cb16cd15e7a17c3d67`. Render has **not** been removed and remains a valid rollback path because the repository contains `server.ts`, `render.yaml`, legacy API routes, explicit frontend fallback calls, and a live Pages `BACKEND_URL` pointing to `https://taketalon-pro.onrender.com`.

The earlier `87%` figure is not reused. The current result below is based on repository inspection, commit history, local build/typecheck, live Supabase metadata and function definitions, and public Cloudflare HTTP checks. No financial test writes were performed.

## Verified percentages

| Area | Current verified status | Evidence and remaining blocker |
|---|---:|---|
| **Deposit migration** | **80%** | Canonical SMS deposit RPC is used by the Cloudflare SMS forwarder; deposit support/report and UI authority safeguards are present. Remaining work is authenticated end-to-end verification with a real provider event, without creating a test deposit. |
| **Admin reconciliation** | **95%** | Live `admin_reconcile_unregistered_sender` includes `ADMIN`, `SUPER_ADMIN`, and `OWNER`, locks sender and wallet rows, prevents repeats, updates balance, writes `wallet_ledgers`, and marks the sender reconciled. The Cloudflare endpoint also recognizes OWNER. The remaining 5% is an actual authenticated OWNER canary, which was not run because it would require a user session and could expose a financial action surface. |
| **Cloudflare readiness** | **85%** | Pages root, health, Supabase status, robots, sitemap, and deployed function paths responded successfully. The project is GitHub-connected and the latest production deployment succeeded. A complete authenticated production traffic matrix and custom-domain cutover verification remain. |
| **Google indexing preservation** | **80%** | HTTPS, 200 responses, crawl-allowing robots rules, sitemap, canonical URL, and Google verification metadata are present. Search Console coverage/index status and the production custom domain were not available for verification. |
| **Yandex indexing preservation** | **80%** | HTTPS, 200 responses, crawl-allowing `YandexBot` rules, sitemap, canonical URL, and stable public URL structure are present. Yandex Webmaster coverage/index status was not available for verification. |
| **Render dependency removal** | **60%** | Major frontend/backend paths have Cloudflare Functions, but the live Pages production and preview configurations still contain `BACKEND_URL=https://taketalon-pro.onrender.com`; the catch-all proxy uses it for any route not yet explicitly dispatched. `server.ts` and `render.yaml` also remain. Provider webhooks, cron/background traffic, and DNS/custom-domain ownership are not fully proven to be independent of Render. |
| **Overall Render removal** | **70% — NOT VERIFIED 100%** | Cloudflare is healthy and Supabase is reachable, but production still has an explicit Render proxy fallback and no custom domain is attached to the Pages project. A full authenticated traffic/cutover matrix has not been completed. Render must remain active. |

## OWNER authorization result

The live production function `admin_reconcile_unregistered_sender(text, uuid)` now has the intended authorization and safety properties:

- caller role must be `ADMIN`, `SUPER_ADMIN`, or `OWNER`;
- the function is `SECURITY DEFINER` with `search_path = public`;
- the sender row is locked with `FOR UPDATE`;
- already reconciled senders are rejected;
- the target wallet is locked with `FOR UPDATE`;
- balance update and `wallet_ledgers` deposit entry occur in the same function;
- reconciliation is marked on `unregistered_senders`;
- `authenticated` has EXECUTE and `anon` does not.

A small follow-up migration, `allow_owner_admin_read_roles`, was applied and committed so the two read-only admin RPCs used by the dashboard also recognize OWNER. It changes no balances, ledgers, deposit rows, withdrawal logic, RLS policy, or public/anonymous privilege.

## Render dependency inventory

The repository still contains the following legacy/rollback surfaces:

- `server.ts` with legacy API routes and Express startup;
- `render.yaml` with the Render web service, build/start commands, and legacy environment variables;
- Cloudflare Pages production and preview both have a plain-text `BACKEND_URL` set to `https://taketalon-pro.onrender.com`;
- `functions/api/[[path]].ts` forwards all unrecognized API paths to that Render URL;
- frontend authentication fallback from Cloudflare login to `/api/auth/login`;
- legacy API routes for sports, SMS, profile photos, email, deposits, and authentication;
- no repository `wrangler.toml`, Pages deployment manifest, custom-domain redirect configuration, or `_headers`/`_redirects` file;
- the Pages project has only the default domain `taketalon.pages.dev`; the Cloudflare Pages custom-domain list is empty;
- the Cloudflare account has no DNS zones visible for this account, so no custom-domain DNS cutover can be verified there;
- deployment-side webhook and cron ownership still needs a separate provider/dashboard check.

These are not grounds to shut down Render; they are the remaining staged-migration inventory.

## SEO and public URL checks

Public Cloudflare checks performed against `https://taketalon.pages.dev/`:

- `/` — HTTP 200 over HTTPS;
- `/robots.txt` — HTTP 200, Googlebot and YandexBot allowed, sitemap declared;
- `/sitemap.xml` — HTTP 200, containing `/` and `/about/`;
- `/api/health` — HTTP 200, database connected through a Cloudflare Pages Function;
- `/api/cloudflare/supabase-status` — HTTP 200, Supabase status `ONLINE`;
- `/api/sports/basketball/games` — HTTP 200 with live ESPN-shaped game data;
- `/api/sports/tennis/games` — HTTP 200 with live ESPN-shaped game data;
- `/api/sports/football/games` — HTTP 200 with football game data;
- `/api/basketball/matches` and `/api/tennis/matches` — HTTP 200 with ESPN data;
- canonical URL and structured metadata point to `https://taketalon.pages.dev/`.

The `www.taketalon.pages.dev` host returned HTTP 404. No production custom domain was identified, so custom-domain URL preservation remains a blocker before any DNS cutover.

## Validation performed

- `npm run lint` passed.
- `npm run build` passed; only a non-blocking large-chunk warning was emitted.
- Git working tree was clean before the migration documentation change.
- Live Supabase migrations, tables, RPC definitions, grants, and function security properties were inspected read-only.
- No financial test writes, fake deposits, wallet mutations, ledger deletions, withdrawal tests, or destructive database changes were performed.

## Next staged steps

1. Verify the actual Cloudflare project bindings, environment variables, custom domain, DNS, webhook targets, and scheduled/background jobs.
2. Run an authenticated canary matrix for login, deposit verification, admin reads, OWNER reconciliation path, profile mutations, and key public routes without financial test writes.
3. Verify Google Search Console and Yandex Webmaster coverage for the preserved canonical URLs.
4. Remove or disable Render dependencies only after the production traffic matrix and rollback plan are complete.
5. Keep Render running until the report can state **OVERALL RENDER REMOVAL: 100% VERIFIED**.

## New blocker requiring staged remediation

The strongest remaining dependency is not merely an old file: production Cloudflare is configured to proxy unrecognized API requests to Render. This must be reduced route-by-route. Do not simply delete `BACKEND_URL` or change the catch-all fallback yet; doing so before every required route is dispatched through Cloudflare could break production. The safe next phase is to inventory every frontend API path against `functions/api`, migrate and verify missing paths, then remove the Render fallback only after a successful production canary matrix.

The sports **read** routes are now verified on Cloudflare. The remaining sports routes identified by the first coverage scan are sync endpoints (`/api/basketball/sync` and `/api/tennis/sync`) that write sports cache tables, plus the dynamic football summary route which already has a Pages Function path. The withdrawal route remains intentionally outside this migration phase. Sync writes should be migrated only with explicit authenticated/service-role controls and idempotency verification; they must not be exposed as unrestricted public write endpoints.
