-- Games & Betting minimum-stake controls.
-- One shared percentage scales each game's established base minimum.
INSERT INTO public.business_rules (key,value,category,control_mode,description)
SELECT 'games_betting_minimum_scale_factor', 1.00, 'GAME', 'SCALE', 'Scales all Games & Betting minimum stakes.'
WHERE NOT EXISTS (SELECT 1 FROM public.business_rules WHERE key='games_betting_minimum_scale_factor');

INSERT INTO public.business_rules (key,value,category,control_mode,description)
SELECT * FROM (VALUES
 ('bet_slip_minimum_stake_fbu',500::numeric,'GAME','DIRECT','Bet slip base minimum stake.'),
 ('aviator_minimum_stake_fbu',500::numeric,'GAME','DIRECT','Aviator base minimum stake.'),
 ('slot777_minimum_stake_fbu',100::numeric,'GAME','DIRECT','Slot777 base minimum stake.'),
 ('crystal_minimum_stake_fbu',100::numeric,'GAME','DIRECT','Crystal Mine base minimum stake.'),
 ('dice_minimum_stake_fbu',100::numeric,'GAME','DIRECT','Provably Fair Dice base minimum stake.'),
 ('plinko_minimum_stake_fbu',100::numeric,'GAME','DIRECT','Plinko Pyramid base minimum stake.')
) AS v(key,value,category,control_mode,description)
WHERE NOT EXISTS (SELECT 1 FROM public.business_rules b WHERE b.key=v.key);

-- Permit the shared Games & Betting scale through the existing approval workflow.
CREATE OR REPLACE FUNCTION public.submit_economic_rule_change(p_key text,p_new_value numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_profile uuid; v_role text; v_pending uuid;
begin
  select id,role into v_profile,v_role from public.profiles where auth_user_id=auth.uid();
  if v_profile is null or v_role not in ('OWNER','SUPER_ADMIN') then return jsonb_build_object('ok',false,'error','not_authorized'); end if;
  if p_key not in ('pricing_scale_factor','premium_membership_scale_factor','games_betting_minimum_scale_factor') then return jsonb_build_object('ok',false,'error','rule_requires_approval_or_is_not_editable'); end if;
  if p_new_value is null or p_new_value < 0 or p_new_value > 1 then return jsonb_build_object('ok',false,'error','scale_must_be_between_0_and_100_percent'); end if;
  select id into v_pending from public.business_rule_change_requests where rule_key=p_key and status='PENDING' limit 1;
  if v_pending is not null then return jsonb_build_object('ok',false,'error','pending_change_exists','request_id',v_pending); end if;
  insert into public.business_rule_change_requests(rule_key,requested_value,requested_by_profile_id) values(p_key,p_new_value,v_profile) returning id into v_pending;
  return jsonb_build_object('ok',true,'status','PENDING','request_id',v_pending);
end;
$function$;
