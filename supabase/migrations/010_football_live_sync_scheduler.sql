-- TakeTalon PRO — Fast live football sync support
-- Scope: football fixture sync/realtime only. Does not touch wallets, bets, unlocks, or posts.

CREATE TABLE IF NOT EXISTS public.football_sync_runtime (
  key TEXT PRIMARY KEY CHECK (key = 'live'),
  lease_until TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_status TEXT,
  last_error TEXT,
  last_records_processed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.football_sync_runtime ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.football_sync_runtime FROM anon, authenticated;
GRANT ALL ON TABLE public.football_sync_runtime TO service_role;

INSERT INTO public.football_sync_runtime (key)
VALUES ('live')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_football_live_sync(p_lease_seconds INTEGER DEFAULT 45)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  lease_seconds INTEGER := GREATEST(15, LEAST(COALESCE(p_lease_seconds, 45), 300));
BEGIN
  UPDATE public.football_sync_runtime
  SET lease_until = now() + make_interval(secs => lease_seconds),
      started_at = now(),
      finished_at = NULL,
      last_status = 'running',
      last_error = NULL,
      updated_at = now()
  WHERE key = 'live'
    AND (lease_until IS NULL OR lease_until < now());

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_football_live_sync(
  p_status TEXT,
  p_records_processed INTEGER DEFAULT 0,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.football_sync_runtime
  SET lease_until = NULL,
      finished_at = now(),
      last_status = CASE WHEN p_status IN ('success', 'failed') THEN p_status ELSE 'failed' END,
      last_error = left(p_error, 2000),
      last_records_processed = GREATEST(COALESCE(p_records_processed, 0), 0),
      updated_at = now()
  WHERE key = 'live';
END;
$$;

-- The Edge Function validates the token against Vault; the token itself is never stored in GitHub.
CREATE OR REPLACE FUNCTION public.verify_football_live_sync_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
DECLARE
  expected_token TEXT;
BEGIN
  SELECT decrypted_secret
  INTO expected_token
  FROM vault.decrypted_secrets
  WHERE name = 'football_live_sync_token'
  LIMIT 1;

  RETURN expected_token IS NOT NULL
     AND p_token IS NOT NULL
     AND p_token = expected_token;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_football_live_sync(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finish_football_live_sync(TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_football_live_sync_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_football_live_sync(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_football_live_sync(TEXT, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_football_live_sync_token(TEXT) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'football_fixtures'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.football_fixtures;
  END IF;
END;
$$;
