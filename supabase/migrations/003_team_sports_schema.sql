-- ============================================================
-- TakeTalon PRO — Unified Team Sports Architecture
-- Migration: 003_team_sports_schema.sql
-- Supports: Icehockey, Rugby, Baseball, Cricket, Volleyball, Handball, etc.
-- ============================================================

-- 1. COMPETITIONS (Unified)
CREATE TABLE IF NOT EXISTS team_sports_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL,
  external_id TEXT,
  provider TEXT DEFAULT 'api-sports',
  name TEXT NOT NULL,
  category_name TEXT,
  country_code TEXT,
  season TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_team_sports_comp UNIQUE (sport, external_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_team_sports_comp_sport ON team_sports_competitions(sport);

-- 2. TEAMS (Unified)
CREATE TABLE IF NOT EXISTS team_sports_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL,
  external_id TEXT,
  provider TEXT DEFAULT 'api-sports',
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_team_sports_team UNIQUE (sport, external_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_team_sports_teams_sport ON team_sports_teams(sport);

-- VIEW for team logos with fallback
CREATE OR REPLACE VIEW team_sports_teams_display AS
SELECT 
  id,
  sport,
  external_id,
  provider,
  name,
  short_name,
  COALESCE(logo_url, '/tt-logo.png') AS logo,
  country,
  created_at,
  updated_at
FROM team_sports_teams;

-- 3. FIXTURES (Unified)
CREATE TABLE IF NOT EXISTS team_sports_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL,
  competition_id UUID REFERENCES team_sports_competitions(id) ON DELETE SET NULL,
  external_id TEXT,
  provider TEXT DEFAULT 'api-sports',
  home_team_id UUID REFERENCES team_sports_teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES team_sports_teams(id) ON DELETE SET NULL,
  home_team_name TEXT,
  away_team_name TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'NS',
  home_score NUMERIC(10, 2) DEFAULT 0,
  away_score NUMERIC(10, 2) DEFAULT 0,
  winner TEXT,
  extra_stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_team_sports_fixture UNIQUE (sport, external_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_team_sports_fix_sport_date ON team_sports_fixtures(sport, match_date);
CREATE INDEX IF NOT EXISTS idx_team_sports_fix_status ON team_sports_fixtures(sport, status);

-- 4. STANDINGS (Unified)
CREATE TABLE IF NOT EXISTS team_sports_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL,
  competition_id UUID REFERENCES team_sports_competitions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES team_sports_teams(id) ON DELETE CASCADE,
  season TEXT,
  rank INT,
  played INT DEFAULT 0,
  won INT DEFAULT 0,
  lost INT DEFAULT 0,
  drawn INT DEFAULT 0,
  points INT DEFAULT 0,
  for_score NUMERIC(10, 2) DEFAULT 0,
  against_score NUMERIC(10, 2) DEFAULT 0,
  extra_stats JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_team_sports_standing UNIQUE (sport, competition_id, team_id, season)
);

CREATE INDEX IF NOT EXISTS idx_team_sports_standings_sport_comp ON team_sports_standings(sport, competition_id);

-- 5. UNIFIED SYNC CONFIG & LOGS
CREATE TABLE IF NOT EXISTS sports_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  provider TEXT DEFAULT 'api-sports',
  last_synced_at TIMESTAMPTZ,
  sync_interval_minutes INT DEFAULT 30,
  config_json JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS sports_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT DEFAULT 'SUCCESS',
  records_processed INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial sync config for standard 5 team sports + handball
INSERT INTO sports_sync_config (sport, is_enabled, provider)
VALUES 
  ('icehockey', TRUE, 'api-sports'),
  ('rugby', TRUE, 'api-sports'),
  ('baseball', TRUE, 'api-sports'),
  ('cricket', TRUE, 'api-sports'),
  ('volleyball', TRUE, 'api-sports'),
  ('handball', TRUE, 'api-sports')
ON CONFLICT (sport) DO NOTHING;

-- RPC helper to fetch active fixtures for a sport
CREATE OR REPLACE FUNCTION get_team_sports_fixtures(
  p_sport TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  fixture_id UUID,
  sport TEXT,
  competition_name TEXT,
  competition_logo TEXT,
  home_team_name TEXT,
  home_team_logo TEXT,
  away_team_name TEXT,
  away_team_logo TEXT,
  match_date TIMESTAMPTZ,
  status TEXT,
  home_score NUMERIC,
  away_score NUMERIC,
  winner TEXT,
  extra_stats JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id AS fixture_id,
    f.sport,
    COALESCE(c.name, 'League') AS competition_name,
    COALESCE(c.logo_url, '/tt-logo.png') AS competition_logo,
    COALESCE(ht.name, f.home_team_name) AS home_team_name,
    COALESCE(ht.logo, '/tt-logo.png') AS home_team_logo,
    COALESCE(at.name, f.away_team_name) AS away_team_name,
    COALESCE(at.logo, '/tt-logo.png') AS away_team_logo,
    f.match_date,
    f.status,
    f.home_score,
    f.away_score,
    f.winner,
    f.extra_stats
  FROM team_sports_fixtures f
  LEFT JOIN team_sports_competitions c ON f.competition_id = c.id
  LEFT JOIN team_sports_teams_display ht ON f.home_team_id = ht.id
  LEFT JOIN team_sports_teams_display at ON f.away_team_id = at.id
  WHERE LOWER(f.sport) = LOWER(p_sport)
  ORDER BY f.match_date ASC
  LIMIT p_limit;
END;
$$;
