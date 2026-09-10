-- Agent Services: percentage-controlled Become Agent fee and atomic activation.

ALTER TABLE public.business_rules DROP CONSTRAINT IF EXISTS business_rules_category_check;
ALTER TABLE public.business_rules ADD CONSTRAINT business_rules_category_check
  CHECK (category IN ('ACCESS','SUBSCRIPTION','DEPOSIT','WITHDRAWAL','FEES','EARNINGS','GAME','TREASURY','SYSTEM','AGENT_SERVICES'));

CREATE TABLE IF NOT EXISTS public.agent_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  join_fee_base_fbu numeric NOT NULL,
  join_fee_scale_factor numeric NOT NULL,
  join_fee_paid_fbu numeric NOT NULL,
  activated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_accounts_select_own ON public.agent_accounts;
CREATE POLICY agent_accounts_select_own ON public.agent_accounts
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()));

INSERT INTO public.business_rules (key, value, category, control_mode, description)
SELECT 'agent_join_fee_fbu', 1000, 'AGENT_SERVICES', 'DIRECT', 'Base fee to activate TakeTalon Agent status.'
WHERE NOT EXISTS (SELECT 1 FROM public.business_rules WHERE key = 'agent_join_fee_fbu');

INSERT INTO public.business_rules (key, value, category, control_mode, description)
SELECT 'agent_join_fee_scale_factor', 1.00, 'AGENT_SERVICES', 'SCALE', 'Percentage applied to the Become Agent base fee.'
WHERE NOT EXISTS (SELECT 1 FROM public.business_rules WHERE key = 'agent_join_fee_scale_factor');

CREATE OR REPLACE FUNCTION public.join_taketalon_agent()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_profile_id uuid;
  v_wallet_id uuid;
  v_agent_id uuid;
  v_balance numeric;
  v_reserved numeric;
  v_available numeric;
  v_base numeric;
  v_scale numeric;
  v_fee numeric;
  v_ledger_id uuid;
begin
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.agent_accounts WHERE profile_id = v_profile_id AND status = 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_agent');
  END IF;

  SELECT value INTO v_base FROM public.business_rules
  WHERE key = 'agent_join_fee_fbu' AND is_active = true;
  SELECT value INTO v_scale FROM public.business_rules
  WHERE key = 'agent_join_fee_scale_factor' AND is_active = true;

  v_base := COALESCE(v_base, 1000);
  v_scale := COALESCE(v_scale, 1);
  IF v_base < 0 OR v_scale < 0 OR v_scale > 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_agent_fee_rule');
  END IF;
  v_fee := round(v_base * v_scale, 2);

  SELECT id, balance, reserved_balance, COALESCE(available_balance, balance - reserved_balance)
    INTO v_wallet_id, v_balance, v_reserved, v_available
  FROM public.wallets
  WHERE profile_id = v_profile_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  END IF;
  IF v_available < v_fee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'required', v_fee, 'available', v_available);
  END IF;

  v_agent_id := gen_random_uuid();
  UPDATE public.wallets
  SET balance = balance - v_fee,
      available_balance = CASE WHEN available_balance IS NULL THEN NULL ELSE available_balance - v_fee END,
      updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO public.agent_accounts (id, profile_id, join_fee_base_fbu, join_fee_scale_factor, join_fee_paid_fbu)
  VALUES (v_agent_id, v_profile_id, v_base, v_scale, v_fee);

  INSERT INTO public.wallet_ledgers
    (wallet_id, amount, balance_before, balance_after, entry_type, reference_type, reference_id)
  VALUES
    (v_wallet_id, -v_fee, v_balance, v_balance - v_fee, 'withdrawal', 'agent_join_fee', v_agent_id)
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'agent_id', v_agent_id,
    'ledger_id', v_ledger_id,
    'fee_paid_fbu', v_fee,
    'new_balance', v_balance - v_fee
  );
end;
$function$;

GRANT EXECUTE ON FUNCTION public.join_taketalon_agent() TO authenticated;
