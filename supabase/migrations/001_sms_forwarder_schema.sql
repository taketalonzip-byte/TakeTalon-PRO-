-- ============================================================
-- TakeTalon PRO — SMS Forwarder Schema  [DRAFT — Task #2]
-- Migration: 001_sms_forwarder_schema.sql
--
-- HALI: DRAFT — haijapitiwa wala kutumika kwenye database.
-- Itakamilishwa, kupitiwa usalama, na kutumika kwenye Task #2.
--
-- Inaongeza:
--   1. sms_messages  — SMS zilizoforwardwa kutoka Android
--   2. transactions  — historia kamili ya malipo
--   3. RPC: process_sms_deposit — inasindika SMS → deposit (atomic + idempotent)
--
-- TODO kabla ya kutumika (Task #2):
--   - Thibitisha profiles na wallets (pamoja na UNIQUE kwenye wallets.profile_id) zipo
--   - Ongeza SET search_path = '' kwenye RPC (SECURITY DEFINER best practice)
--   - Thibitisha amount, profile_id, na mpesa_code kutoka SMS row yenyewe ndani ya RPC
--   - Jaribu idempotency na concurrent calls kabla ya deploy
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. SMS_MESSAGES TABLE  (lazima iwe ya kwanza — transactions inarejea hapa)
--    Android SMS Forwarder app inaweka SMS hapa.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SMS ghafi
  sender           TEXT        NOT NULL,          -- jina/nambari iliyotuma SMS (e.g. "MPESA")
  body             TEXT        NOT NULL,          -- maandishi kamili ya SMS
  received_at      TIMESTAMPTZ NOT NULL,          -- wakati simu ilipopokea SMS

  -- Taarifa zilizochorwa (parsed) kutoka body
  sender_phone     TEXT,                          -- nambari ya mtu aliyetuma pesa, e.g. "+254722123456"
  mpesa_code       TEXT        UNIQUE,            -- e.g. "SHK1234ABCD" — UNIQUE kuzuia duplicates
  amount           NUMERIC(15, 2),
  currency         TEXT        DEFAULT 'FBU',     -- FBU, KES, n.k.

  -- Aina ya SMS
  sms_type         TEXT        DEFAULT 'MPESA'
                     CHECK (sms_type IN ('MPESA', 'AIRTEL', 'TIGO', 'ORANGE', 'OTHER')),

  -- Usindikaji
  processed        BOOLEAN     NOT NULL DEFAULT FALSE,
  processed_at     TIMESTAMPTZ,
  error_message    TEXT,

  -- Muunganiko na mtumiaji (baada ya kulinganisha nambari ya simu)
  matched_profile_id UUID      REFERENCES profiles(id) ON DELETE SET NULL,

  -- Kifaa kilichotuma (Device ID ya Android forwarder)
  device_id        TEXT,
  raw_payload      JSONB       DEFAULT '{}',

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_sender          ON sms_messages(sender);
CREATE INDEX IF NOT EXISTS idx_sms_sender_phone    ON sms_messages(sender_phone)    WHERE sender_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_mpesa_code      ON sms_messages(mpesa_code)      WHERE mpesa_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_unprocessed     ON sms_messages(processed)       WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_sms_matched_profile ON sms_messages(matched_profile_id) WHERE matched_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_received_at     ON sms_messages(received_at DESC);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Mtumiaji anaona SMS zake tu (kwa debugging)
CREATE POLICY "Mtumiaji anaona sms zake"
  ON sms_messages FOR SELECT
  USING (
    matched_profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Maandishi yote (INSERT, UPDATE, DELETE) ni ya service role tu
CREATE POLICY "Service role inaandika sms_messages"
  ON sms_messages FOR ALL
  USING (auth.role() = 'service_role');


-- ────────────────────────────────────────────────────────────
-- 2. TRANSACTIONS TABLE  (baada ya sms_messages — FK salama sasa)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  type            TEXT        NOT NULL CHECK (type IN (
                    'DEPOSIT',
                    'WITHDRAW',
                    'BET_PLACE',
                    'BET_WIN',
                    'UPGRADE_PRO',
                    'UNLOCK_FEE',
                    'UNLOCK_EARN'
                  )),

  amount          NUMERIC(15, 2) NOT NULL CHECK (amount > 0),

  status          TEXT        NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')),

  -- FK kwa SMS iliyozalisha deposit hii
  -- UNIQUE: hakuna deposit mbili kutoka SMS moja
  sms_message_id  UUID        UNIQUE REFERENCES sms_messages(id) ON DELETE SET NULL,

  mpesa_code      TEXT        UNIQUE,   -- kuzuia kuingiza mara mbili kwa M-Pesa code moja
  description     TEXT,
  metadata        JSONB       DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_profile_id  ON transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_tx_type        ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_tx_status      ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_created_at  ON transactions(created_at DESC);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mtumiaji anaona transactions zake"
  ON transactions FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role inaandika transactions"
  ON transactions FOR ALL
  USING (auth.role() = 'service_role');


-- ────────────────────────────────────────────────────────────
-- 3. TRIGGER: updated_at kwa transactions
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 4. RPC: process_sms_deposit  (atomic + idempotent)
--
--    Usalama wa concurrency:
--    - SELECT ... FOR UPDATE SKIP LOCKED: inafunga safu ya SMS
--      haraka — thread nyingine inayojaribu wakati huo huo
--      itaruka safu hiyo bila kusubiri, na kurudisha error.
--    - UNIQUE constraint kwenye transactions.sms_message_id
--      na transactions.mpesa_code: hata kama thread mbili
--      zilipita FOR UPDATE, INSERT ya pili itashindwa na
--      unique violation badala ya kuongeza salio mara mbili.
--
--    Params:
--      p_sms_id      — id ya sms_messages row
--      p_profile_id  — id ya profiles row (matched)
--      p_amount      — kiasi cha kuongeza (numeric)
--      p_mpesa_code  — nambari ya rejeleo ya M-Pesa (optional)
--      p_description — maelezo (optional)
--
--    Returns JSON: { ok, new_balance, transaction_id } | { ok: false, error }
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_sms_deposit(
  p_sms_id      UUID,
  p_profile_id  UUID,
  p_amount      NUMERIC,
  p_mpesa_code  TEXT    DEFAULT NULL,
  p_description TEXT    DEFAULT 'Deposit via SMS'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked_id      UUID;
  v_transaction_id UUID;
  v_new_balance    NUMERIC;
BEGIN
  -- ── Hatua 1: Funga safu ya SMS atomically ──────────────────
  -- FOR UPDATE SKIP LOCKED: kama thread nyingine imeshafunga
  -- safu hii, tunarudi mara moja badala ya kusubiri — hii
  -- inazuia deposit mara mbili kutoka concurrent calls.
  SELECT id INTO v_locked_id
  FROM sms_messages
  WHERE id = p_sms_id
    AND processed = FALSE
  FOR UPDATE SKIP LOCKED;

  -- Kama hakupata lock (tayari imeshindikizwa AU thread nyingine imefunga)
  IF v_locked_id IS NULL THEN
    RETURN json_build_object(
      'ok',    FALSE,
      'error', 'SMS hii tayari imeshindikizwa au inashindikizwa na mchakato mwingine'
    );
  END IF;

  -- ── Hatua 2: Ingiza transaction (UNIQUE constraints zinalinda) ──
  -- Kama mpesa_code au sms_message_id tayari ipo, INSERT itashindwa
  -- na unique violation — hii ni safu ya pili ya ulinzi.
  BEGIN
    INSERT INTO transactions (
      profile_id, type, amount, status,
      sms_message_id, mpesa_code, description
    )
    VALUES (
      p_profile_id, 'DEPOSIT', p_amount, 'COMPLETED',
      p_sms_id, p_mpesa_code, p_description
    )
    RETURNING id INTO v_transaction_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object(
      'ok',    FALSE,
      'error', 'Transaction hii tayari ipo (mpesa_code au sms_message_id inarudiwa)'
    );
  END;

  -- ── Hatua 3: Ongeza salio (tengeneza wallet kama haijapo) ──
  INSERT INTO wallets (profile_id, balance, reserved_balance)
  VALUES (p_profile_id, 0, 0)
  ON CONFLICT (profile_id) DO NOTHING;

  UPDATE wallets
  SET balance = balance + p_amount
  WHERE profile_id = p_profile_id
  RETURNING balance INTO v_new_balance;

  -- ── Hatua 4: Weka SMS kama imeshindikizwa ──────────────────
  UPDATE sms_messages
  SET processed          = TRUE,
      processed_at       = NOW(),
      matched_profile_id = p_profile_id
  WHERE id = p_sms_id;

  RETURN json_build_object(
    'ok',             TRUE,
    'new_balance',    v_new_balance,
    'transaction_id', v_transaction_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Rekodi hitilafu kwenye SMS ili ionekane kwenye dashboard
  UPDATE sms_messages
  SET error_message = SQLERRM
  WHERE id = p_sms_id;

  RETURN json_build_object(
    'ok',    FALSE,
    'error', SQLERRM
  );
END;
$$;

-- Rudi idhini: service role peke yake inaweza kuita RPC hii
REVOKE ALL ON FUNCTION process_sms_deposit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_sms_deposit TO service_role;


-- ────────────────────────────────────────────────────────────
-- 5. REALTIME — sikiliza mabadiliko mapya haraka
-- ────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE sms_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
