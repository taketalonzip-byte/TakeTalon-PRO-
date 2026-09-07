-- TakeTalon PRO — shared-core in-play football odds

CREATE OR REPLACE FUNCTION football_compute_inplay_odds(
  p_home_team_id UUID,
  p_away_team_id UUID,
  p_home_score INT,
  p_away_score INT,
  p_current_minute INT
)
RETURNS TABLE(odds_home NUMERIC, odds_draw NUMERIC, odds_away NUMERIC, model TEXT)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  remaining_fraction NUMERIC;
  l RECORD;
  p RECORD;
  o RECORD;
BEGIN
  remaining_fraction := GREATEST(0, (90 - COALESCE(p_current_minute, 0))) / 90.0;

  SELECT * INTO l FROM football_estimate_lambdas(p_home_team_id, p_away_team_id);
  SELECT * INTO p FROM football_poisson_outcome_probs(
    l.lambda_home * remaining_fraction,
    l.lambda_away * remaining_fraction,
    COALESCE(p_home_score, 0),
    COALESCE(p_away_score, 0)
  );
  SELECT * INTO o FROM football_probs_to_odds(p.p_home, p.p_draw, p.p_away);

  RETURN QUERY SELECT o.odds_home, o.odds_draw, o.odds_away, l.model || '_inplay';
END;
$$;

CREATE OR REPLACE FUNCTION trg_football_fixtures_odds()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.status IN ('SCHEDULED', 'TIMED', 'POSTPONED')
     AND NEW.home_team_id IS NOT NULL
     AND NEW.away_team_id IS NOT NULL THEN
    SELECT * INTO r FROM football_compute_odds(NEW.home_team_id, NEW.away_team_id);
    NEW.odds_home := r.odds_home;
    NEW.odds_draw := r.odds_draw;
    NEW.odds_away := r.odds_away;
    NEW.odds_model := r.model;
    NEW.odds_updated_at := now();
  ELSIF NEW.status IN ('IN_PLAY', 'PAUSED')
        AND NEW.home_team_id IS NOT NULL
        AND NEW.away_team_id IS NOT NULL THEN
    IF TG_OP = 'UPDATE'
       AND (NEW.home_score IS DISTINCT FROM OLD.home_score
         OR NEW.away_score IS DISTINCT FROM OLD.away_score) THEN
      NEW.betting_suspended_until := now() + interval '30 seconds';
    END IF;

    SELECT * INTO r FROM football_compute_inplay_odds(
      NEW.home_team_id,
      NEW.away_team_id,
      NEW.home_score,
      NEW.away_score,
      NEW.current_minute
    );
    NEW.odds_home := r.odds_home;
    NEW.odds_draw := r.odds_draw;
    NEW.odds_away := r.odds_away;
    NEW.odds_model := r.model;
    NEW.odds_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS football_fixtures_live_odds_trigger ON football_fixtures;
DROP FUNCTION IF EXISTS trg_football_fixtures_live_odds();

DROP TRIGGER IF EXISTS football_fixtures_odds_trigger ON football_fixtures;
CREATE TRIGGER football_fixtures_odds_trigger
BEFORE INSERT OR UPDATE OF status, home_team_id, away_team_id, home_score, away_score, current_minute
ON football_fixtures
FOR EACH ROW
EXECUTE FUNCTION trg_football_fixtures_odds();
