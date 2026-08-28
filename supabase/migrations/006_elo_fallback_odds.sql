-- ============================================================
-- TakeTalon PRO — Elo-based fallback for football odds
-- Replaces static 2.10/3.10/2.80 fallback with Elo-derived odds
-- when a team lacks enough finished-match history for Poisson.
-- ============================================================

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
  home_elo NUMERIC; away_elo NUMERIC;
  elo_diff NUMERIC; win_raw NUMERIC; draw_p NUMERIC := 0.25;
BEGIN
  SELECT * INTO h FROM football_team_form(p_home_team_id, TRUE, 10);
  SELECT * INTO a FROM football_team_form(p_away_team_id, FALSE, 10);

  IF h.matches_count < min_matches OR a.matches_count < min_matches THEN
    -- Elo-based fallback (differentiates strong vs weak teams even
    -- with little/no match history), instead of a flat static price.
    SELECT elo_rating INTO home_elo FROM football_teams WHERE id = p_home_team_id;
    SELECT elo_rating INTO away_elo FROM football_teams WHERE id = p_away_team_id;
    home_elo := COALESCE(home_elo, 1500);
    away_elo := COALESCE(away_elo, 1500);

    elo_diff := home_elo - away_elo + 60; -- +60 home advantage, matches elo trigger
    win_raw := 1.0 / (1.0 + power(10, -elo_diff / 400.0));

    p_home := (1 - draw_p) * win_raw;
    p_away := (1 - draw_p) * (1 - win_raw);
    p_draw := draw_p;

    RETURN QUERY SELECT
      ROUND((margin / GREATEST(p_home, 0.01))::NUMERIC, 2),
      ROUND((margin / GREATEST(p_draw, 0.01))::NUMERIC, 2),
      ROUND((margin / GREATEST(p_away, 0.01))::NUMERIC, 2),
      'elo_fallback'::TEXT;
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
    home_elo := NULL;
    SELECT elo_rating INTO home_elo FROM football_teams WHERE id = p_home_team_id;
    SELECT elo_rating INTO away_elo FROM football_teams WHERE id = p_away_team_id;
    home_elo := COALESCE(home_elo, 1500);
    away_elo := COALESCE(away_elo, 1500);
    elo_diff := home_elo - away_elo + 60;
    win_raw := 1.0 / (1.0 + power(10, -elo_diff / 400.0));
    p_home := (1 - draw_p) * win_raw;
    p_away := (1 - draw_p) * (1 - win_raw);
    p_draw := draw_p;
    RETURN QUERY SELECT
      ROUND((margin / GREATEST(p_home, 0.01))::NUMERIC, 2),
      ROUND((margin / GREATEST(p_draw, 0.01))::NUMERIC, 2),
      ROUND((margin / GREATEST(p_away, 0.01))::NUMERIC, 2),
      'elo_fallback'::TEXT;
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

-- Backfill: recompute odds for all fixtures currently stuck on the
-- old static default_fallback so they reflect Elo immediately.
UPDATE football_fixtures f
SET odds_home = sub.odds_home, odds_draw = sub.odds_draw, odds_away = sub.odds_away,
    odds_model = sub.model, odds_updated_at = now()
FROM (
  SELECT id, (football_compute_odds(home_team_id, away_team_id)).*
  FROM football_fixtures
  WHERE status IN ('SCHEDULED', 'TIMED', 'POSTPONED')
) sub
WHERE f.id = sub.id;
