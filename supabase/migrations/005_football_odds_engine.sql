-- ============================================================
-- TakeTalon PRO — Football Odds Engine (Poisson + Elo)
-- Auto-generates & self-corrects match odds on football_fixtures
-- (the match "bet card" table — NOT the social `posts` table)
-- ============================================================

-- 1. Storage: odds columns on the bet-card table + elo on teams
ALTER TABLE football_fixtures
  ADD COLUMN IF NOT EXISTS odds_home NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS odds_draw NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS odds_away NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS odds_model TEXT DEFAULT 'default_fallback',
  ADD COLUMN IF NOT EXISTS odds_updated_at TIMESTAMPTZ;

ALTER TABLE football_teams
  ADD COLUMN IF NOT EXISTS elo_rating NUMERIC(7,2) DEFAULT 1500;

-- 2. Poisson pmf helper
CREATE OR REPLACE FUNCTION poisson_pmf(k INT, lambda NUMERIC)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN lambda <= 0 THEN (CASE WHEN k = 0 THEN 1 ELSE 0 END)::NUMERIC
    ELSE exp(-lambda) * power(lambda, k) / factorial(k)
  END;
$$;

-- 3. Recent home/away scoring form for a team (from finished fixtures)
CREATE OR REPLACE FUNCTION football_team_form(p_team_id UUID, p_as_home BOOLEAN, p_limit INT DEFAULT 10)
RETURNS TABLE(avg_scored NUMERIC, avg_conceded NUMERIC, matches_count INT)
LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(AVG(CASE WHEN p_as_home THEN home_score ELSE away_score END), 0),
    COALESCE(AVG(CASE WHEN p_as_home THEN away_score ELSE home_score END), 0),
    COUNT(*)::INT
  FROM (
    SELECT home_score, away_score FROM football_fixtures
    WHERE status = 'FINISHED'
      AND home_score IS NOT NULL AND away_score IS NOT NULL
      AND ((p_as_home AND home_team_id = p_team_id) OR (NOT p_as_home AND away_team_id = p_team_id))
    ORDER BY utc_kickoff DESC
    LIMIT p_limit
  ) t;
$$;

-- 4. Core odds calculator: Poisson model, with balanced default fallback
--    when either team lacks enough match history.
CREATE OR REPLACE FUNCTION football_compute_odds(p_home_team_id UUID, p_away_team_id UUID)
RETURNS TABLE(odds_home NUMERIC, odds_draw NUMERIC, odds_away NUMERIC, model TEXT)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  h RECORD; a RECORD;
  lambda_home NUMERIC; lambda_away NUMERIC;
  p_home NUMERIC := 0; p_draw NUMERIC := 0; p_away NUMERIC := 0;
  total NUMERIC;
  i INT; j INT; p NUMERIC;
  margin NUMERIC := 1.07;   -- ~7% overround
  min_matches INT := 3;
BEGIN
  SELECT * INTO h FROM football_team_form(p_home_team_id, TRUE, 10);
  SELECT * INTO a FROM football_team_form(p_away_team_id, FALSE, 10);

  IF h.matches_count < min_matches OR a.matches_count < min_matches THEN
    RETURN QUERY SELECT 2.10::NUMERIC, 3.10::NUMERIC, 2.80::NUMERIC, 'default_fallback'::TEXT;
    RETURN;
  END IF;

  lambda_home := GREATEST(0.15, (h.avg_scored + a.avg_conceded) / 2.0);
  lambda_away := GREATEST(0.15, (a.avg_scored + h.avg_conceded) / 2.0);

  FOR i IN 0..8 LOOP
    FOR j IN 0..8 LOOP
      p := poisson_pmf(i, lambda_home) * poisson_pmf(j, lambda_away);
      IF i > j THEN p_home := p_home + p;
      ELSIF i = j THEN p_draw := p_draw + p;
      ELSE p_away := p_away + p;
      END IF;
    END LOOP;
  END LOOP;

  total := p_home + p_draw + p_away;
  IF total <= 0 THEN
    RETURN QUERY SELECT 2.10::NUMERIC, 3.10::NUMERIC, 2.80::NUMERIC, 'default_fallback'::TEXT;
    RETURN;
  END IF;

  p_home := p_home / total; p_draw := p_draw / total; p_away := p_away / total;

  RETURN QUERY SELECT
    ROUND((margin / GREATEST(p_home, 0.01))::NUMERIC, 2),
    ROUND((margin / GREATEST(p_draw, 0.01))::NUMERIC, 2),
    ROUND((margin / GREATEST(p_away, 0.01))::NUMERIC, 2),
    'poisson'::TEXT;
END;
$$;

-- 5. Self-correction trigger: recompute odds whenever a fixture card is
--    created, or its teams/status/scores change (BEFORE => no recursive UPDATE)
CREATE OR REPLACE FUNCTION trg_football_fixtures_odds()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.status IN ('SCHEDULED', 'TIMED', 'POSTPONED')
     AND NEW.home_team_id IS NOT NULL AND NEW.away_team_id IS NOT NULL THEN
    SELECT * INTO r FROM football_compute_odds(NEW.home_team_id, NEW.away_team_id);
    NEW.odds_home := r.odds_home;
    NEW.odds_draw := r.odds_draw;
    NEW.odds_away := r.odds_away;
    NEW.odds_model := r.model;
    NEW.odds_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS football_fixtures_odds_trigger ON football_fixtures;
CREATE TRIGGER football_fixtures_odds_trigger
BEFORE INSERT OR UPDATE OF status, home_team_id, away_team_id, home_score, away_score
ON football_fixtures
FOR EACH ROW
EXECUTE FUNCTION trg_football_fixtures_odds();

-- 6. Elo self-correction: update team ratings once a fixture finishes,
--    feeding future football_team_form()/Poisson calls (separate table, no recursion).
CREATE OR REPLACE FUNCTION trg_football_update_elo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  home_elo NUMERIC; away_elo NUMERIC;
  expected_home NUMERIC; actual_home NUMERIC;
  k NUMERIC := 20;
BEGIN
  IF NEW.status = 'FINISHED' AND (OLD.status IS DISTINCT FROM 'FINISHED')
     AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    SELECT elo_rating INTO home_elo FROM football_teams WHERE id = NEW.home_team_id;
    SELECT elo_rating INTO away_elo FROM football_teams WHERE id = NEW.away_team_id;
    home_elo := COALESCE(home_elo, 1500);
    away_elo := COALESCE(away_elo, 1500);

    expected_home := 1.0 / (1.0 + power(10, (away_elo - home_elo - 60) / 400.0));
    IF NEW.home_score > NEW.away_score THEN actual_home := 1;
    ELSIF NEW.home_score = NEW.away_score THEN actual_home := 0.5;
    ELSE actual_home := 0;
    END IF;

    UPDATE football_teams SET elo_rating = home_elo + k * (actual_home - expected_home), updated_at = now()
      WHERE id = NEW.home_team_id;
    UPDATE football_teams SET elo_rating = away_elo + k * ((1 - actual_home) - (1 - expected_home)), updated_at = now()
      WHERE id = NEW.away_team_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS football_fixtures_elo_trigger ON football_fixtures;
CREATE TRIGGER football_fixtures_elo_trigger
AFTER UPDATE OF status ON football_fixtures
FOR EACH ROW
EXECUTE FUNCTION trg_football_update_elo();

-- 7. Backfill odds for all currently scheduled fixtures (bet cards) missing odds
UPDATE football_fixtures f
SET odds_home = sub.odds_home, odds_draw = sub.odds_draw, odds_away = sub.odds_away,
    odds_model = sub.model, odds_updated_at = now()
FROM (
  SELECT id, (football_compute_odds(home_team_id, away_team_id)).*
  FROM football_fixtures
  WHERE status IN ('SCHEDULED', 'TIMED', 'POSTPONED') AND odds_home IS NULL
) sub
WHERE f.id = sub.id;
