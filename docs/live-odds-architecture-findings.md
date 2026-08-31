# Live Odds Architecture Findings

## Verified production state

- Supabase project `jrefgmvoosyxxjyhnycx` has `pg_cron` 1.6.4 and `pg_net` installed.
- `football_sync_config` currently includes `espn_live_refresh_seconds=20` and `live_fixtures_refresh_minutes=2`.
- The repository has no Vercel, Railway, Render, Fly, Docker, or GitHub Actions deployment configuration.
- The only production Edge Function currently listed is `sms-forwarder`; there is no football sync worker.
- Existing football sync is request-driven through the Express server and `syncEspnCompetition()`.

## Official documentation findings

- Supabase officially documents invoking Edge Functions periodically with `pg_cron` plus `pg_net`; its scheduling example is every minute and recommends Supabase Vault for the project URL and auth token.
- Supabase documents `pg_net` as asynchronous HTTP from Postgres, with request/response observability and a default HTTP timeout parameter.
- Supabase Realtime Postgres Changes requires adding the target table to the `supabase_realtime` publication and then subscribing from the client using a public/publishable key.
- The current official scheduling example establishes one-minute cadence; a sub-minute SLA must not be assumed from that example without a separate verified capability/plan test.

## Design implication

For goal-to-odds latency of only a few seconds, a one-minute `pg_cron` schedule is insufficient by itself. The implementation should either use a verified sub-minute worker/host, or explicitly accept approximately one-minute provider-to-DB delay while Realtime keeps DB-to-browser propagation fast. The Edge Function path remains a viable one-minute baseline, but it should not be presented as a few-second live betting solution without measuring it.

References:

1. https://supabase.com/docs/guides/functions/schedule-functions
2. https://supabase.com/docs/guides/database/extensions/pg_net
3. https://supabase.com/docs/guides/realtime/postgres-changes
4. https://supabase.com/docs/guides/database/extensions/pg_cron

Saved during the architecture assessment on 2026-08-31.

## Additional verified details

- The official Supabase Cron quickstart documents a `30 seconds` schedule and states that 1–59 second intervals are supported on Postgres 15.1.1.61 or later. It also documents invoking an Edge Function through `pg_net` with a five-second HTTP timeout.
- Supabase Edge Functions expose `SUPABASE_SECRET_KEYS` (and legacy `SUPABASE_SERVICE_ROLE_KEY`) to server-side functions; secret keys bypass RLS and must never be used in a browser.
- Supabase's service-to-service auth guidance supports a custom secret-key path with JWT verification disabled when the function validates the caller's secret itself. For this worker, a random token will be generated into Vault and sent only by the database cron job in `x-football-sync-token`.
- Production RLS currently has public SELECT policies on `football_fixtures`, `football_competitions`, and `football_teams`, which is sufficient for browser Realtime subscriptions while writes remain service-role-only.

Additional references:

5. https://supabase.com/docs/guides/cron/quickstart "Supabase Cron Quickstart"
6. https://supabase.com/docs/guides/functions/secrets "Supabase Edge Function Environment Variables"
7. https://supabase.com/docs/guides/functions/auth "Supabase Edge Function Authentication"
