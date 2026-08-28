CREATE OR REPLACE VIEW v_odds_model_stats AS
SELECT
  odds_model,
  count(*) AS fixtures,
  round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct,
  min(odds_home) AS min_odds_home,
  max(odds_home) AS max_odds_home
FROM football_fixtures
WHERE odds_model IS NOT NULL
GROUP BY odds_model
ORDER BY fixtures DESC;
