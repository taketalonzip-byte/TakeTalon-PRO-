-- Unlock economic-control pilot
-- Centralizes the Access & Subscription rule and gives OWNER/SUPER_ADMIN
-- audited control without allowing client-side wallet mutations.

ALTER TABLE public.business_rules
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS control_mode text NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN IF NOT EXISTS min_value numeric,
  ADD COLUMN IF NOT EXISTS max_value numeric,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS effective_from timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.business_rules
  DROP CONSTRAINT IF EXISTS business_rules_category_check;
ALTER TABLE public.business_rules
  ADD CONSTRAINT business_rules_category_check
  CHECK (category IN ('SYSTEM','ACCESS','SUBSCRIPTION','DEPOSIT','WITHDRAWAL','GAME','EARNINGS','FEES','TREASURY'));

ALTER TABLE public.business_rules
  DROP CONSTRAINT IF EXISTS business_rules_control_mode_check;
ALTER TABLE public.business_rules
  ADD CONSTRAINT business_rules_control_mode_check
  CHECK (control_mode IN ('DIRECT','SCALE','RATE','LIMIT','TOGGLE'));

UPDATE public.business_rules
SET category = 'ACCESS', control_mode = 'SCALE', version = version + 1
WHERE key IN ('unlock_price_x_month', 'pricing_scale_factor', 'commission_month', 'interval_minutes');

UPDATE public.business_rules
SET category = 'SYSTEM'
WHERE category IS NULL;

CREATE OR REPLACE FUNCTION public.admin_update_business_rule(p_key text, p_new_value numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_old_value numeric;
  v_category text;
  v_control_mode text;
  v_new_version integer;
begin
  select id, role into v_caller_id, v_caller_role
  from public.profiles
  where auth_user_id = auth.uid();

  if v_caller_id is null or v_caller_role is null
     or v_caller_role not in ('OWNER','SUPER_ADMIN') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  select value, category, control_mode, version
    into v_old_value, v_category, v_control_mode, v_new_version
  from public.business_rules
  where key = p_key and is_active = true;

  if v_old_value is null then
    return jsonb_build_object('ok', false, 'error', 'rule_not_found');
  end if;

  if v_category = 'SYSTEM' then
    return jsonb_build_object('ok', false, 'error', 'system_rule_not_editable');
  end if;

  if p_new_value is null or p_new_value < 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_rule_value');
  end if;

  update public.business_rules
  set value = p_new_value,
      version = version + 1,
      updated_at = now()
  where key = p_key;

  insert into public.business_rules_audit_log
    (rule_key, old_value, new_value, changed_by_profile_id)
  values
    (p_key, v_old_value, p_new_value, v_caller_id);

  return jsonb_build_object(
    'ok', true,
    'key', p_key,
    'category', v_category,
    'control_mode', v_control_mode,
    'old_value', v_old_value,
    'new_value', p_new_value,
    'version', v_new_version + 1
  );
end;
$function$;

-- Pilot setting: 500 FBU base price x 0.01 = 5 FBU effective price.
-- This is reversible by setting pricing_scale_factor back to 1.00 through
-- the audited OWNER/SUPER_ADMIN RPC.
UPDATE public.business_rules
SET value = 0.01,
    version = version + 1,
    updated_at = now()
WHERE key = 'pricing_scale_factor';

INSERT INTO public.business_rules_audit_log
  (rule_key, old_value, new_value, changed_by_profile_id)
SELECT 'pricing_scale_factor', 1.00, 0.01, NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.business_rules_audit_log
  WHERE rule_key = 'pricing_scale_factor'
    AND old_value = 1.00
    AND new_value = 0.01
  LIMIT 1
);

COMMENT ON COLUMN public.business_rules.category IS 'Economic control group; ACCESS is used by Unlock pilot.';
COMMENT ON COLUMN public.business_rules.control_mode IS 'How the rule controls the base value: SCALE, RATE, LIMIT, TOGGLE, or DIRECT.';
COMMENT ON COLUMN public.business_rules.version IS 'Monotonic version incremented on audited rule changes.';
