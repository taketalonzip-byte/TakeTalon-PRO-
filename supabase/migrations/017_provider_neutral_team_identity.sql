-- TakeTalon PRO — provider-neutral football team identity
-- Uses normalized names as a safety net across ESPN and football-data.org
-- where the same club has different provider IDs or suffixes.

CREATE OR REPLACE FUNCTION football_team_identity_key(p_team_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT regexp_replace(
           regexp_replace(
             regexp_replace(lower(regexp_replace(COALESCE(name, ''), '[^a-z0-9]+', '', 'g')), '^(afc|fc|sc|ac|as|ss|ogc)', ''),
             '(afc|fc|cf|sc|ac|cfc|ud|sv|as|ss|ogc)$', ''
           ),
           '[^a-z0-9]', '', 'g'
         )
  FROM football_teams
  WHERE id = p_team_id;
$$;

CREATE OR REPLACE FUNCTION football_team_form_weighted(
  p_team_id UUID,
  p_as_home BOOLEAN,
  p_limit INT DEFAULT 15
)
RETURNS TABLE(avg_scored NUMERIC, avg_conceded NUMERIC, matches_count INT)
LANGUAGE sql STABLE AS $$
  WITH target AS (
    SELECT football_team_identity_key(p_team_id) AS identity_key
  ), ranked AS (
    SELECT
      CASE WHEN p_as_home THEN f.home_score ELSE f.away_score END::NUMERIC AS scored,
      CASE WHEN p_as_home THEN f.away_score ELSE f.home_score END::NUMERIC AS conceded,
      ROW_NUMBER() OVER (ORDER BY f.utc_kickoff DESC NULLS LAST, f.id DESC) - 1 AS recency_rank
    FROM football_fixtures f
    JOIN target t ON TRUE
    WHERE f.status = 'FINISHED'
      AND f.home_score IS NOT NULL
      AND f.away_score IS NOT NULL
      AND ((p_as_home AND football_team_identity_key(f.home_team_id) = t.identity_key)
        OR (NOT p_as_home AND football_team_identity_key(f.away_team_id) = t.identity_key))
    ORDER BY f.utc_kickoff DESC NULLS LAST, f.id DESC
    LIMIT p_limit
  ), weighted AS (
    SELECT scored, conceded, power(0.85::NUMERIC, recency_rank)::NUMERIC AS weight
    FROM ranked
  )
  SELECT
    COALESCE(SUM(scored * weight) / NULLIF(SUM(weight), 0), 0)::NUMERIC,
    COALESCE(SUM(conceded * weight) / NULLIF(SUM(weight), 0), 0)::NUMERIC,
    COUNT(*)::INT
  FROM weighted;
$$;

CREATE OR REPLACE FUNCTION football_propagate_team_odds(p_team_id UUID)
RETURNS VOID
LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  identity_key TEXT := football_team_identity_key(p_team_id);
BEGIN
  UPDATE football_fixtures f
  SET odds_home = priced.odds_home,
      odds_draw = priced.odds_draw,
      odds_away = priced.odds_away,
      odds_model = priced.model,
      odds_updated_at = now()
  FROM (
    SELECT f2.id, (football_compute_odds(f2.home_team_id, f2.away_team_id)).*
    FROM football_fixtures f2
    WHERE f2.status IN ('SCHEDULED', 'TIMED', 'POSTPONED')
      AND (football_team_identity_key(f2.home_team_id) = identity_key
        OR football_team_identity_key(f2.away_team_id) = identity_key)
  ) priced
  WHERE f.id = priced.id;
END;
$$;

-- Backfill all pending cards after switching to provider-neutral history.
UPDATE football_fixtures f
SET odds_home = priced.odds_home,
    odds_draw = priced.odds_draw,
    odds_away = priced.odds_away,
    odds_model = priced.model,
    odds_updated_at = now()
FROM (
  SELECT f2.id, (football_compute_odds(f2.home_team_id, f2.away_team_id)).*
  FROM football_fixtures f2
  WHERE f2.status IN ('SCHEDULED', 'TIMED', 'POSTPONED')
) priced
WHERE f.id = priced.id;
