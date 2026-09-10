-- Independent percentage controls for each game, all shown under GAME.
INSERT INTO public.business_rules (key,value,category,control_mode,description)
SELECT * FROM (VALUES
 ('bet_slip_minimum_scale_factor',1.00::numeric,'GAME','SCALE','Bet Slip minimum percentage.'),
 ('aviator_minimum_scale_factor',1.00::numeric,'GAME','SCALE','Aviator minimum percentage.'),
 ('slot777_minimum_scale_factor',1.00::numeric,'GAME','SCALE','Slot777 minimum percentage.'),
 ('crystal_minimum_scale_factor',1.00::numeric,'GAME','SCALE','Crystal Mine minimum percentage.'),
 ('dice_minimum_scale_factor',1.00::numeric,'GAME','SCALE','Dice minimum percentage.'),
 ('plinko_minimum_scale_factor',1.00::numeric,'GAME','SCALE','Plinko minimum percentage.'),
 ('vip_card_minimum_scale_factor',1.00::numeric,'GAME','SCALE','One linked percentage for VIP Card capital and players-balance minimums.'),
 ('vip_card_minimum_capital_fbu',1000::numeric,'GAME','DIRECT','VIP Card published minimum capital deposit.'),
 ('vip_card_players_balance_filter_fbu',1000::numeric,'GAME','DIRECT','VIP Card published players balance filter minimum.')
) AS v(key,value,category,control_mode,description)
WHERE NOT EXISTS (SELECT 1 FROM public.business_rules b WHERE b.key=v.key);

CREATE OR REPLACE FUNCTION public.submit_economic_rule_change(p_key text,p_new_value numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_profile uuid; v_role text; v_pending uuid;
begin
  select id,role into v_profile,v_role from public.profiles where auth_user_id=auth.uid();
  if v_profile is null or v_role not in ('OWNER','SUPER_ADMIN') then return jsonb_build_object('ok',false,'error','not_authorized'); end if;
  if p_key not in (
    'pricing_scale_factor','premium_membership_scale_factor',
    'bet_slip_minimum_scale_factor','aviator_minimum_scale_factor',
    'slot777_minimum_scale_factor','crystal_minimum_scale_factor',
    'dice_minimum_scale_factor','plinko_minimum_scale_factor',
    'vip_card_minimum_scale_factor'
  ) then return jsonb_build_object('ok',false,'error','rule_requires_approval_or_is_not_editable'); end if;
  if p_new_value is null or p_new_value < 0 or p_new_value > 1 then return jsonb_build_object('ok',false,'error','scale_must_be_between_0_and_100_percent'); end if;
  select id into v_pending from public.business_rule_change_requests where rule_key=p_key and status='PENDING' limit 1;
  if v_pending is not null then return jsonb_build_object('ok',false,'error','pending_change_exists','request_id',v_pending); end if;
  insert into public.business_rule_change_requests(rule_key,requested_value,requested_by_profile_id)
    values(p_key,p_new_value,v_profile) returning id into v_pending;
  return jsonb_build_object('ok',true,'status','PENDING','request_id',v_pending);
end;
$function$;
