-- TakeTalon PRO — weighted football history, shared probability core, and Elo propagation

CREATE OR REPLACE FUNCTION football_team_form_weighted(
  p_team_id UUID,
  p_as_home BOOLEAN,
  p_limit INT DEFAULT 15
)
RETURNS TABLE(avg_scored NUMERIC, avg_conceded NUMERIC, matches_count INT)
LANGUAGE sql STABLE AS $$
  WITH ranked AS (
    SELECT
      CASE WHEN p_as_home THEN home_score ELSE away_score END::NUMERIC AS scored,
      CASE WHEN p_as_home THEN away_score ELSE home_score END::NUMERIC AS conceded,
      ROW_NUMBER() OVER (ORDER BY utc_kickoff DESC NULLS LAST, id DESC) - 1 AS recency_rank
    FROM football_fixtures
    WHERE status = 'FINISHED'
      AND home_score IS NOT NULL
      AND away_score IS NOT NULL
      AND ((p_as_home AND home_team_id = p_team_id)
        OR (NOT p_as_home AND away_team_id = p_team_id))
    ORDER BY utc_kickoff DESC NULLS LAST, id DESC
    LIMIT p_limit
  ), weighted AS (
    SELECT
      scored,
      conceded,
      power(0.85::NUMERIC, recency_rank)::NUMERIC AS weight
    FROM ranked
  )
  SELECT
    COALESCE(SUM(scored * weight) / NULLIF(SUM(weight), 0), 0)::NUMERIC,
    COALESCE(SUM(conceded * weight) / NULLIF(SUM(weight), 0), 0)::NUMERIC,
    COUNT(*)::INT
  FROM weighted;
$$;

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

  RETURN QUERY SELECT
    LEAST(4.5::NUMERIC, GREATEST(0.15::NUMERIC, 1.35 * power(10::NUMERIC, elo_diff / 800.0))),
    LEAST(4.5::NUMERIC, GREATEST(0.15::NUMERIC, 1.35 * power(10::NUMERIC, -elo_diff / 800.0))),
    'elo_fallback_weighted'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION football_poisson_outcome_probs(
  lambda_home NUMERIC,
  lambda_away NUMERIC,
  offset_home INT DEFAULT 0,
  offset_away INT DEFAULT 0
)
RETURNS TABLE(p_home NUMERIC, p_draw NUMERIC, p_away NUMERIC)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  home_prob NUMERIC := 0;
  draw_prob NUMERIC := 0;
  away_prob NUMERIC := 0;
  total NUMERIC;
  i INT;
  j INT;
  p NUMERIC;
BEGIN
  FOR i IN 0..8 LOOP
    FOR j IN 0..8 LOOP
      p := poisson_pmf(i, lambda_home) * poisson_pmf(j, lambda_away);
      IF offset_home + i > offset_away + j THEN
        home_prob := home_prob + p;
      ELSIF offset_home + i = offset_away + j THEN
        draw_prob := draw_prob + p;
      ELSE
        away_prob := away_prob + p;
      END IF;
    END LOOP;
  END LOOP;

  total := home_prob + draw_prob + away_prob;
  IF total <= 0 THEN
    RETURN QUERY SELECT 0::NUMERIC, 1::NUMERIC, 0::NUMERIC;
  ELSE
    RETURN QUERY SELECT home_prob / total, draw_prob / total, away_prob / total;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION football_probs_to_odds(
  p_home NUMERIC,
  p_draw NUMERIC,
  p_away NUMERIC,
  margin NUMERIC DEFAULT 1.07
)
RETURNS TABLE(odds_home NUMERIC, odds_draw NUMERIC, odds_away NUMERIC)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    ROUND((margin / GREATEST(p_home, 0.01))::NUMERIC, 2),
    ROUND((margin / GREATEST(p_draw, 0.01))::NUMERIC, 2),
    ROUND((margin / GREATEST(p_away, 0.01))::NUMERIC, 2);
$$;

-- The live project had an older six-column implementation; drop it so the
-- required shared-core four-column contract can be installed cleanly.
DROP FUNCTION IF EXISTS football_compute_odds(UUID, UUID);

CREATE FUNCTION football_compute_odds(p_home_team_id UUID, p_away_team_id UUID)
RETURNS TABLE(odds_home NUMERIC, odds_draw NUMERIC, odds_away NUMERIC, model TEXT)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  l RECORD;
  p RECORD;
  o RECORD;
BEGIN
  SELECT * INTO l FROM football_estimate_lambdas(p_home_team_id, p_away_team_id);
  SELECT * INTO p FROM football_poisson_outcome_probs(l.lambda_home, l.lambda_away, 0, 0);
  SELECT * INTO o FROM football_probs_to_odds(p.p_home, p.p_draw, p.p_away);
  RETURN QUERY SELECT o.odds_home, o.odds_draw, o.odds_away, l.model;
END;
$$;

CREATE OR REPLACE FUNCTION football_propagate_team_odds(p_team_id UUID)
RETURNS VOID
LANGUAGE plpgsql VOLATILE AS $$
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
    WHERE (f2.home_team_id = p_team_id OR f2.away_team_id = p_team_id)
      AND f2.status IN ('SCHEDULED', 'TIMED', 'POSTPONED')
  ) priced
  WHERE f.id = priced.id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_football_propagate_odds_on_elo_change()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM football_propagate_team_odds(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS football_teams_elo_propagate_trigger ON football_teams;
CREATE TRIGGER football_teams_elo_propagate_trigger
AFTER UPDATE OF elo_rating ON football_teams
FOR EACH ROW
WHEN (OLD.elo_rating IS DISTINCT FROM NEW.elo_rating)
EXECUTE FUNCTION trg_football_propagate_odds_on_elo_change();

-- Apply weighted-history pricing immediately to all pending fixtures.
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
