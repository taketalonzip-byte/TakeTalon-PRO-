-- Secure RPC: odds model coverage stats, restricted to ADMIN and SUPER_ADMIN.
-- OWNER intentionally excluded per product decision.
CREATE OR REPLACE FUNCTION get_odds_model_stats()
RETURNS TABLE(odds_model TEXT, fixtures BIGINT, pct NUMERIC, min_odds_home NUMERIC, max_odds_home NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();

  IF caller_role IS NULL OR caller_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY SELECT * FROM v_odds_model_stats;
END;
$$;

-- Least privilege: only authenticated users may even attempt the call
-- (the role check inside does the real gating).
REVOKE ALL ON FUNCTION get_odds_model_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_odds_model_stats() TO authenticated;
