-- ============================================================
-- TakeTalon PRO — Unregistered Senders Registry & Reconciliation
-- Migration: 002_unregistered_senders_schema.sql
-- ============================================================

-- 1. Table for SMS deposit logs if not already created
CREATE TABLE IF NOT EXISTS sms_deposit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_phone TEXT NOT NULL,
  phone_normalized TEXT,
  parsed_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(15, 2) DEFAULT 0,
  sms_reference TEXT,
  raw_sms TEXT,
  status TEXT DEFAULT 'unmatched' CHECK (status IN ('matched', 'unmatched', 'failed', 'pending')),
  matched_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sms_dep_logs_unmatched 
  ON sms_deposit_logs(status, phone_normalized) 
  WHERE matched_profile_id IS NULL;

-- 2. Seed default unregistered sender test rows
-- Row A: Standard Lumicash SMS
INSERT INTO sms_deposit_logs (
  sender_phone,
  phone_normalized,
  parsed_amount,
  amount,
  sms_reference,
  raw_sms,
  status
)
SELECT 
  '68375032',
  '68375032',
  100.00,
  100.00,
  'REG_SEED_68375032',
  'L''abonne 68375032 vous a envoye 100 Fbu. Transaction Lumicash Id: TXN882910.',
  'unmatched'
WHERE NOT EXISTS (
  SELECT 1 FROM sms_deposit_logs WHERE phone_normalized = '68375032' AND status = 'unmatched'
);

-- Row B: Fraud alert test SMS with 1,000,000 FBU ("Je Depose 1000000Fbu")
INSERT INTO sms_deposit_logs (
  sender_phone,
  phone_normalized,
  parsed_amount,
  amount,
  sms_reference,
  raw_sms,
  status
)
SELECT 
  '+25769001122',
  '69001122',
  1000000.00,
  1000000.00,
  'REF_SUSPICIOUS_1M',
  'Je Depose 1000000Fbu',
  'unmatched'
WHERE NOT EXISTS (
  SELECT 1 FROM sms_deposit_logs WHERE sms_reference = 'REF_SUSPICIOUS_1M'
);

-- 3. RPC: admin_get_unregistered_senders()
CREATE OR REPLACE FUNCTION admin_get_unregistered_senders()
RETURNS TABLE (
  phone_normalized TEXT,
  sender_phone TEXT,
  total_unmatched_amount NUMERIC,
  parsed_amount NUMERIC,
  deposit_count BIGINT,
  last_seen_at TIMESTAMPTZ,
  raw_sms_text TEXT,
  sms_reference TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(l.phone_normalized, l.sender_phone) AS phone_normalized,
    l.sender_phone AS sender_phone,
    SUM(COALESCE(l.parsed_amount, l.amount, 0)) OVER (PARTITION BY COALESCE(l.phone_normalized, l.sender_phone))::NUMERIC AS total_unmatched_amount,
    COALESCE(l.parsed_amount, l.amount, 0)::NUMERIC AS parsed_amount,
    COUNT(*) OVER (PARTITION BY COALESCE(l.phone_normalized, l.sender_phone))::BIGINT AS deposit_count,
    l.created_at AS last_seen_at,
    COALESCE(l.raw_sms, '') AS raw_sms_text,
    COALESCE(l.sms_reference, 'N/A') AS sms_reference
  FROM sms_deposit_logs l
  WHERE (l.matched_profile_id IS NULL OR l.status IN ('unmatched', 'UNMATCHED'))
    AND COALESCE(l.phone_normalized, l.sender_phone) IS NOT NULL
  ORDER BY l.created_at DESC;
END;
$$;

-- 4. RPC: admin_reconcile_unregistered_sender(p_phone_normalized, p_profile_id)
CREATE OR REPLACE FUNCTION admin_reconcile_unregistered_sender(
  p_phone_normalized TEXT,
  p_profile_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_amount NUMERIC := 0;
  v_count INT := 0;
  v_username TEXT;
  v_new_balance NUMERIC;
BEGIN
  -- Get target username
  SELECT username INTO v_username
  FROM profiles
  WHERE id = p_profile_id;

  IF v_username IS NULL THEN
    RETURN json_build_object(
      'ok', FALSE,
      'error', 'Akaunti ya mtumiaji haikupatikana.'
    );
  END IF;

  -- Calculate total unmatched amount for this phone
  SELECT COALESCE(SUM(COALESCE(parsed_amount, amount, 0)), 0), COUNT(*)
  INTO v_total_amount, v_count
  FROM sms_deposit_logs
  WHERE (phone_normalized = p_phone_normalized OR sender_phone = p_phone_normalized)
    AND (matched_profile_id IS NULL OR status IN ('unmatched', 'UNMATCHED'));

  -- Fallback: if no rows in sms_deposit_logs, check sms_messages
  IF v_count = 0 THEN
    SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO v_total_amount, v_count
    FROM sms_messages
    WHERE (sender_phone = p_phone_normalized OR sender = p_phone_normalized)
      AND matched_profile_id IS NULL;
  END IF;

  IF v_count = 0 OR v_total_amount <= 0 THEN
    RETURN json_build_object(
      'ok', FALSE,
      'error', 'Hakuna amana zisizo na mmiliki kwa namba hii.'
    );
  END IF;

  -- Update sms_deposit_logs
  UPDATE sms_deposit_logs
  SET matched_profile_id = p_profile_id,
      status = 'matched',
      processed_at = NOW()
  WHERE (phone_normalized = p_phone_normalized OR sender_phone = p_phone_normalized)
    AND (matched_profile_id IS NULL OR status IN ('unmatched', 'UNMATCHED'));

  -- Update sms_messages if present
  UPDATE sms_messages
  SET matched_profile_id = p_profile_id,
      processed = TRUE,
      processed_at = NOW()
  WHERE (sender_phone = p_phone_normalized OR sender = p_phone_normalized)
    AND matched_profile_id IS NULL;

  -- Update or insert wallet balance
  INSERT INTO wallets (profile_id, balance, reserved_balance)
  VALUES (p_profile_id, v_total_amount, 0)
  ON CONFLICT (profile_id)
  DO UPDATE SET balance = wallets.balance + v_total_amount, updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- Create transaction history
  INSERT INTO transactions (
    profile_id,
    type,
    amount,
    status,
    description
  ) VALUES (
    p_profile_id,
    'DEPOSIT',
    v_total_amount,
    'COMPLETED',
    'Reconciled deposit from unregistered sender ' || p_phone_normalized
  );

  RETURN json_build_object(
    'ok', TRUE,
    'amount', v_total_amount,
    'username', v_username,
    'new_balance', v_new_balance,
    'message', 'FBU ' || v_total_amount || ' zimehamishiwa kwenye wallet ya @' || v_username
  );
END;
$$;
