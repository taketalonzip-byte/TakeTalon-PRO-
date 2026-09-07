-- TakeTalon PRO — canonical team identity repair and partial-history odds
-- Fixes cross-provider duplicates such as Barcelona (ESPN) vs FC Barcelona
-- (football-data.org), which previously isolated history and Elo by provider.

-- 1. Merge the confirmed Barcelona duplicate into the canonical ESPN entity.
-- Keep the ESPN team because it contains the real recent results and live-sync
-- identity; move all historical and upcoming fixture references first.
UPDATE football_fixtures
SET home_team_id = 'd9735255-356e-49d2-b299-4b1e1dbfe374'
WHERE home_team_id = '04554cc5-3aeb-4e73-aa6c-63346b6a2713';

UPDATE football_fixtures
SET away_team_id = 'd9735255-356e-49d2-b299-4b1e1dbfe374'
WHERE away_team_id = '04554cc5-3aeb-4e73-aa6c-63346b6a2713';

UPDATE football_teams
SET elo_rating = GREATEST(
  COALESCE(elo_rating, 1500),
  COALESCE((SELECT elo_rating FROM football_teams WHERE id = '04554cc5-3aeb-4e73-aa6c-63346b6a2713'), 1500)
), updated_at = now()
WHERE id = 'd9735255-356e-49d2-b299-4b1e1dbfe374';

DELETE FROM football_teams
WHERE id = '04554cc5-3aeb-4e73-aa6c-63346b6a2713';

-- 2. Use available weighted history even when one or both teams have fewer
-- than three matches. Three matches remains the full-history threshold, but
-- a strong team with 1–2 verified results must not be priced as a generic
-- 1500-Elo team. Elo remains the baseline for missing sides.
CREATE OR REPLACE FUNCTION football_estimate_lambdas(
  p_home_team_id UUID,
  p_away_team_id UUID
)
RETURNS TABLE(lambda_home NUMERIC, lambda_away NUMERIC, model TEXT)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  h RECORD;
  a RECORD;
  home_elo NUMERIC;
  away_elo NUMERIC;
  elo_diff NUMERIC;
  elo_lambda_home NUMERIC;
  elo_lambda_away NUMERIC;
  home_attack NUMERIC;
  home_defence NUMERIC;
  away_attack NUMERIC;
  away_defence NUMERIC;
BEGIN
  SELECT * INTO h FROM football_team_form_weighted(p_home_team_id, TRUE, 15);
  SELECT * INTO a FROM football_team_form_weighted(p_away_team_id, FALSE, 15);

  IF h.matches_count >= 3 AND a.matches_count >= 3 THEN
    RETURN QUERY SELECT
      GREATEST(0.15::NUMERIC, (h.avg_scored + a.avg_conceded) / 2.0),
      GREATEST(0.15::NUMERIC, (a.avg_scored + h.avg_conceded) / 2.0),
      'poisson_weighted'::TEXT;
    RETURN;
  END IF;

  SELECT COALESCE(elo_rating, 1500) INTO home_elo
  FROM football_teams WHERE id = p_home_team_id;
  SELECT COALESCE(elo_rating, 1500) INTO away_elo
  FROM football_teams WHERE id = p_away_team_id;
  home_elo := COALESCE(home_elo, 1500);
  away_elo := COALESCE(away_elo, 1500);
  elo_diff := home_elo - away_elo + 60;

  elo_lambda_home := LEAST(4.5::NUMERIC, GREATEST(0.15::NUMERIC,
    1.35 * power(10::NUMERIC, elo_diff / 800.0)));
  elo_lambda_away := LEAST(4.5::NUMERIC, GREATEST(0.15::NUMERIC,
    1.35 * power(10::NUMERIC, -elo_diff / 800.0)));

  home_attack := CASE WHEN h.matches_count > 0 THEN h.avg_scored ELSE elo_lambda_home END;
  home_defence := CASE WHEN h.matches_count > 0 THEN h.avg_conceded ELSE elo_lambda_away END;
  away_attack := CASE WHEN a.matches_count > 0 THEN a.avg_scored ELSE elo_lambda_away END;
  away_defence := CASE WHEN a.matches_count > 0 THEN a.avg_conceded ELSE elo_lambda_home END;

  IF h.matches_count > 0 OR a.matches_count > 0 THEN
    RETURN QUERY SELECT
      GREATEST(0.15::NUMERIC, (home_attack + away_defence) / 2.0),
      GREATEST(0.15::NUMERIC, (away_attack + home_defence) / 2.0),
      'poisson_partial_history'::TEXT;
  ELSE
    RETURN QUERY SELECT elo_lambda_home, elo_lambda_away, 'elo_fallback_weighted'::TEXT;
  END IF;
END;
$$;

-- 3. Reprice every pending fixture after identity repair and partial-history
-- activation. The odds trigger and Elo propagation keep these prices current.
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
