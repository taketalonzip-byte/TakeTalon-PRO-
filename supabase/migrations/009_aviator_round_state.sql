-- ============================================================
-- TakeTalon PRO — Aviator Live Round State Schema
-- Migration: 009_aviator_round_state.sql
--
-- Lengo: Aviator iwe "live" 24/7 kwa watumiaji WOTE kwa wakati
-- mmoja, badala ya kila browser kutengeneza round yake binafsi
-- (tatizo la awali: kila mtu akifungua ukurasa, round ilianza upya).
--
-- Jedwali hili ni "single source of truth" ya round ya sasa.
-- Server pekee (service role, ndani ya server.ts) ndiye anaandika;
-- watumiaji wote wanasoma tu, na wanapata mabadiliko papo hapo
-- kupitia Supabase Realtime.
--
-- MUHIMU (usalama/uadilifu wa mchezo): crash_point HAIANDIKWI
-- kwenye row mpaka round i-BUST. Hivyo hakuna mtumiaji anayeweza
-- kuona au kutabiri crash point kabla haijatokea, hata kwa
-- kufuatilia Realtime subscription moja kwa moja.
-- ============================================================

CREATE TABLE IF NOT EXISTS aviator_round_state (
  id                    SMALLINT     PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- row moja tu (singleton)
  round_id              UUID         NOT NULL DEFAULT gen_random_uuid(),
  phase                 TEXT         NOT NULL DEFAULT 'BETTING'
                           CHECK (phase IN ('BETTING', 'LAUNCHED', 'BUSTED')),
  phase_started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  betting_duration_ms   INTEGER      NOT NULL DEFAULT 10000,
  busted_duration_ms    INTEGER      NOT NULL DEFAULT 4000,
  crash_point           NUMERIC(10, 2),  -- NULL mpaka phase = 'BUSTED'
  round_nonce           BIGINT       NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Hakikisha row ya singleton ipo tayari (server itaijaza mara tu itakapoanza)
INSERT INTO aviator_round_state (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE aviator_round_state ENABLE ROW LEVEL SECURITY;

-- Kila mtu (hata bila kuingia) anaruhusiwa KUSOMA tu round ya sasa
CREATE POLICY "Kila mtu anasoma aviator round ya sasa"
  ON aviator_round_state FOR SELECT
  USING (true);

-- Maandishi (INSERT, UPDATE, DELETE) ni ya service role (server.ts) pekee
CREATE POLICY "Service role pekee inaandika aviator_round_state"
  ON aviator_round_state FOR ALL
  USING (auth.role() = 'service_role');

-- REALTIME — watumiaji wote wanapata mabadiliko ya round papo hapo
ALTER PUBLICATION supabase_realtime ADD TABLE aviator_round_state;
