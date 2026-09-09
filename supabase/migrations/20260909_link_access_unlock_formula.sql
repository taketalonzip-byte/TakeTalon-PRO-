-- Linked Access/Unlock economic model.
-- Canonical values remain 500 FBU/month, 10% platform commission,
-- 450 FBU/month recipient share, paid every 30 minutes.
-- Owner/SuperAdmin changes only pricing_scale_factor; every dependent amount
-- is derived from the same scale.

UPDATE public.business_rules
SET value = CASE key
  WHEN 'unlock_price_x_month' THEN 500
  WHEN 'unlock_price_y_month' THEN 450
  WHEN 'commission_month' THEN 0.10
  WHEN 'interval_minutes' THEN 30
  ELSE value
END,
version = version + 1,
updated_at = now()
WHERE key IN ('unlock_price_x_month','unlock_price_y_month','commission_month','interval_minutes');

INSERT INTO public.business_rules (key, value, category, control_mode, description)
SELECT 'unlock_cancel_window_minutes', 10, 'ACCESS', 'LIMIT', 'Full refund window after acceptance; before the first 30-minute charge.'
WHERE NOT EXISTS (SELECT 1 FROM public.business_rules WHERE key = 'unlock_cancel_window_minutes' LIMIT 1);

UPDATE public.business_rules
SET category = 'ACCESS', control_mode = 'LIMIT', is_active = true
WHERE key = 'unlock_cancel_window_minutes';

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
  from public.profiles where auth_user_id = auth.uid();

  if v_caller_id is null or v_caller_role not in ('OWNER','SUPER_ADMIN') then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if p_new_value is null or p_new_value < 0 or p_new_value > 1 then
    return jsonb_build_object('ok', false, 'error', 'scale_must_be_between_0_and_100_percent');
  end if;
  if p_key <> 'pricing_scale_factor' then
    return jsonb_build_object('ok', false, 'error', 'access_amounts_are_linked_to_pricing_scale_factor');
  end if;

  select value, category, control_mode, version
    into v_old_value, v_category, v_control_mode, v_new_version
  from public.business_rules
  where key = p_key and is_active = true;

  if v_old_value is null then
    return jsonb_build_object('ok', false, 'error', 'rule_not_found');
  end if;

  update public.business_rules
  set value = p_new_value, version = version + 1, updated_at = now()
  where key = p_key;

  insert into public.business_rules_audit_log
    (rule_key, old_value, new_value, changed_by_profile_id)
  values (p_key, v_old_value, p_new_value, v_caller_id);

  return jsonb_build_object(
    'ok', true,
    'key', p_key,
    'category', v_category,
    'control_mode', v_control_mode,
    'old_value', v_old_value,
    'new_value', p_new_value,
    'version', v_new_version + 1,
    'effective_base_fbu', 500 * p_new_value,
    'effective_commission_fbu', 500 * p_new_value * 0.10,
    'effective_recipient_share_fbu', 500 * p_new_value * 0.90
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.accept_unlock(p_contract_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_contract record; v_caller_id uuid; v_base numeric; v_scale numeric;
  v_effective numeric; v_wallet record; v_available numeric;
begin
  select id into v_caller_id from public.profiles where auth_user_id = auth.uid();
  select * into v_contract from public.unlock_contracts where id = p_contract_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if v_contract.unlocked_id <> v_caller_id then return jsonb_build_object('ok', false, 'error', 'not_authorized'); end if;
  if v_contract.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'invalid_status'); end if;

  select value into v_base from public.business_rules where key='unlock_price_x_month';
  select coalesce((select value from public.business_rules where key='pricing_scale_factor'), 1) into v_scale;
  v_effective := v_base * v_scale;
  select * into v_wallet from public.wallets where profile_id = v_contract.unlocker_id for update;
  if v_wallet is null then return jsonb_build_object('ok', false, 'error', 'wallet_not_found'); end if;
  v_available := v_wallet.balance - v_wallet.reserved_balance;
  if v_available < v_effective then return jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'needed', v_effective, 'available', v_available); end if;

  update public.wallets set reserved_balance = reserved_balance + v_effective, updated_at = now() where id = v_wallet.id;
  insert into public.wallet_ledgers (wallet_id, amount, balance_before, balance_after, entry_type, reference_type, reference_id)
    values (v_wallet.id, -v_effective, v_available, v_available - v_effective, 'reserve', 'unlock_contract', p_contract_id);
  update public.unlock_contracts set status='active', accepted_at=now(), expires_at=now()+interval '30 days', last_charged_at=now(), reserved_amount=v_effective where id=p_contract_id;
  return jsonb_build_object('ok', true, 'effective_price', v_effective, 'first_charge_after_minutes', 30);
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_unlock(p_contract_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_contract record; v_caller_id uuid; v_wallet record; v_available numeric; v_window numeric;
  v_full_refund boolean := false;
begin
  select id into v_caller_id from public.profiles where auth_user_id = auth.uid();
  select * into v_contract from public.unlock_contracts where id=p_contract_id for update;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if v_contract.unlocker_id <> v_caller_id then return jsonb_build_object('ok',false,'error','not_authorized'); end if;
  if v_contract.status not in ('pending','active') then return jsonb_build_object('ok',false,'error','invalid_status'); end if;
  select coalesce(value,10) into v_window from public.business_rules where key='unlock_cancel_window_minutes';
  v_full_refund := v_contract.status='pending' OR (v_contract.accepted_at IS NOT NULL AND now() <= v_contract.accepted_at + (v_window || ' minutes')::interval);

  if v_contract.status='active' and v_contract.reserved_amount > 0 then
    select * into v_wallet from public.wallets where profile_id=v_contract.unlocker_id for update;
    v_available := v_wallet.balance - v_wallet.reserved_balance;
    update public.wallets set reserved_balance=greatest(0,reserved_balance-v_contract.reserved_amount), updated_at=now() where id=v_wallet.id;
    insert into public.wallet_ledgers (wallet_id, amount, balance_before, balance_after, entry_type, reference_type, reference_id)
      values (v_wallet.id, v_contract.reserved_amount, v_available, v_available+v_contract.reserved_amount, 'release', 'unlock_contract', p_contract_id);
  end if;
  update public.unlock_contracts set status='cancelled', cancelled_at=now(), reserved_amount=0 where id=p_contract_id;
  return jsonb_build_object('ok',true,'full_refund',v_full_refund,'refund_amount',coalesce(v_contract.reserved_amount,0));
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_due_unlock_payments()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  r record; v_interval int; v_base numeric; v_scale numeric; v_rate numeric;
  v_x_month numeric; v_comm_month numeric; v_y_month numeric; v_x_per numeric; v_y_per numeric; v_comm_per numeric;
  v_wallet_x record; v_wallet_y record; v_periods numeric;
begin
  select value into v_interval from public.business_rules where key='interval_minutes';
  select value into v_base from public.business_rules where key='unlock_price_x_month';
  select coalesce((select value from public.business_rules where key='pricing_scale_factor'),1) into v_scale;
  select coalesce((select value from public.business_rules where key='commission_month'),0.10) into v_rate;
  v_x_month:=v_base*v_scale; v_comm_month:=v_x_month*v_rate; v_y_month:=v_x_month-v_comm_month;
  v_periods:=(30::numeric*24*60)/v_interval; v_x_per:=v_x_month/v_periods; v_y_per:=v_y_month/v_periods; v_comm_per:=v_comm_month/v_periods;

  for r in select * from public.unlock_contracts where status='active' and last_charged_at <= now()-(v_interval||' minutes')::interval order by id for update skip locked loop
    if r.expires_at <= now() or r.reserved_amount < v_x_per then update public.unlock_contracts set status='expired' where id=r.id; continue; end if;
    select * into v_wallet_x from public.wallets where profile_id=r.unlocker_id for update;
    select * into v_wallet_y from public.wallets where profile_id=r.unlocked_id for update;
    update public.wallets set balance=balance-v_x_per,reserved_balance=reserved_balance-v_x_per,updated_at=now() where id=v_wallet_x.id;
    insert into public.wallet_ledgers(wallet_id,amount,balance_before,balance_after,entry_type,reference_type,reference_id) values(v_wallet_x.id,-v_x_per,v_wallet_x.balance,v_wallet_x.balance-v_x_per,'unlock_charge','unlock_contract',r.id);
    update public.wallets set balance=balance+v_y_per,updated_at=now() where id=v_wallet_y.id;
    insert into public.wallet_ledgers(wallet_id,amount,balance_before,balance_after,entry_type,reference_type,reference_id) values(v_wallet_y.id,v_y_per,v_wallet_y.balance,v_wallet_y.balance+v_y_per,'unlock_credit','unlock_contract',r.id);
    update public.platform_wallet set balance=balance+v_comm_per,updated_at=now() where id=1;
    update public.unlock_contracts set last_charged_at=now(),intervals_charged=intervals_charged+1,reserved_amount=reserved_amount-v_x_per where id=r.id;
  end loop;
  update public.unlock_contracts set status='expired' where status='active' and expires_at<=now();
end;
$function$;
