-- TakeTalon PRO — Remove test money and profile-photo charging
-- This migration is intentionally irreversible for test-money functions and records.

-- Test self-deposit/withdraw must not be callable in any environment after this migration.
REVOKE ALL ON FUNCTION public.test_self_deposit(numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.test_self_withdraw(numeric) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.test_self_deposit(numeric);
DROP FUNCTION IF EXISTS public.test_self_withdraw(numeric);

-- Remove obsolete test-mode configuration and test cap rules.
DELETE FROM public.business_rules
WHERE key IN ('test_mode_enabled', 'test_deposit_per_request_cap', 'test_deposit_daily_cap');

-- Defense-in-depth: no future code or service path may write test-money ledger entries.
CREATE OR REPLACE FUNCTION public.reject_test_money_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_type IN ('test_self_deposit', 'test_self_withdraw') THEN
    RAISE EXCEPTION 'test_money_disabled';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_test_money_ledger_entry ON public.wallet_ledgers;
CREATE TRIGGER trg_reject_test_money_ledger_entry
BEFORE INSERT OR UPDATE ON public.wallet_ledgers
FOR EACH ROW
EXECUTE FUNCTION public.reject_test_money_ledger_entry();

-- Profile photos are free. The old transaction table is retained only as historical schema;
-- application code no longer writes charge/price transaction records.
DELETE FROM public.business_rules
WHERE key IN ('profile_photo_new_price', 'profile_photo_switch_price', 'profile_photo_restore_price');
