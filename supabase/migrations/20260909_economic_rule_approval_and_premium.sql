-- Economic rule changes are staged until one distinct SUPER_ADMIN approves.
CREATE TABLE IF NOT EXISTS public.business_rule_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL REFERENCES public.business_rules(key),
  requested_value numeric NOT NULL,
  requested_by_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  approved_by_profile_id uuid REFERENCES public.profiles(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  reason text
);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_rule_request
  ON public.business_rule_change_requests(rule_key) WHERE status='PENDING';

INSERT INTO public.business_rules (key,value,category,control_mode,description)
SELECT 'premium_membership_scale_factor', 1.00, 'SUBSCRIPTION', 'SCALE', 'PRO Elite price scale: 100% = 15,000 FBU/month.'
WHERE NOT EXISTS (SELECT 1 FROM public.business_rules WHERE key='premium_membership_scale_factor' LIMIT 1);
INSERT INTO public.business_rules (key,value,category,control_mode,description)
SELECT 'premium_membership_price_fbu', 15000, 'SUBSCRIPTION', 'DIRECT', 'PRO Elite base monthly price before scale.'
WHERE NOT EXISTS (SELECT 1 FROM public.business_rules WHERE key='premium_membership_price_fbu' LIMIT 1);

CREATE OR REPLACE FUNCTION public.submit_economic_rule_change(p_key text, p_new_value numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_profile uuid; v_role text; v_pending uuid;
begin
  select id, role into v_profile, v_role from public.profiles where auth_user_id=auth.uid();
  if v_profile is null or v_role not in ('OWNER','SUPER_ADMIN') then return jsonb_build_object('ok',false,'error','not_authorized'); end if;
  if p_key not in ('pricing_scale_factor','premium_membership_scale_factor') then return jsonb_build_object('ok',false,'error','rule_requires_approval_or_is_not_editable'); end if;
  if p_new_value is null or p_new_value < 0 or p_new_value > 1 then return jsonb_build_object('ok',false,'error','scale_must_be_between_0_and_100_percent'); end if;
  select id into v_pending from public.business_rule_change_requests where rule_key=p_key and status='PENDING' limit 1;
  if v_pending is not null then return jsonb_build_object('ok',false,'error','pending_change_exists','request_id',v_pending); end if;
  insert into public.business_rule_change_requests(rule_key,requested_value,requested_by_profile_id)
    values(p_key,p_new_value,v_profile) returning id into v_pending;
  return jsonb_build_object('ok',true,'status','PENDING','request_id',v_pending);
end;
$function$;

CREATE OR REPLACE FUNCTION public.approve_economic_rule_change(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_profile uuid; v_role text; v_request record; v_old numeric; v_version integer;
begin
  select id, role into v_profile, v_role from public.profiles where auth_user_id=auth.uid();
  if v_profile is null or v_role <> 'SUPER_ADMIN' then return jsonb_build_object('ok',false,'error','super_admin_approval_required'); end if;
  select * into v_request from public.business_rule_change_requests where id=p_request_id for update;
  if not found then return jsonb_build_object('ok',false,'error','request_not_found'); end if;
  if v_request.status <> 'PENDING' then return jsonb_build_object('ok',false,'error','request_already_decided'); end if;
  if v_request.requested_by_profile_id = v_profile then return jsonb_build_object('ok',false,'error','requester_cannot_approve_own_change'); end if;
  select value, version into v_old, v_version from public.business_rules where key=v_request.rule_key and is_active=true for update;
  update public.business_rules set value=v_request.requested_value, version=version+1, updated_at=now() where key=v_request.rule_key;
  insert into public.business_rules_audit_log(rule_key,old_value,new_value,changed_by_profile_id) values(v_request.rule_key,v_old,v_request.requested_value,v_profile);
  update public.business_rule_change_requests set status='APPROVED', approved_by_profile_id=v_profile, decided_at=now() where id=p_request_id;
  return jsonb_build_object('ok',true,'status','APPROVED','rule_key',v_request.rule_key,'new_value',v_request.requested_value,'version',v_version+1);
end;
$function$;

-- Direct economic updates must now be staged for one SuperAdmin approval.
CREATE OR REPLACE FUNCTION public.admin_update_business_rule(p_key text,p_new_value numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  return public.submit_economic_rule_change(p_key,p_new_value);
end;
$function$;
