CREATE OR REPLACE FUNCTION public.cancel_economic_rule_change(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_profile uuid;
  v_request record;
begin
  select id into v_profile
  from public.profiles
  where auth_user_id = auth.uid();

  select * into v_request
  from public.business_rule_change_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'request_not_found');
  end if;
  if v_request.status <> 'PENDING' then
    return jsonb_build_object('ok', false, 'error', 'request_already_decided');
  end if;
  if v_request.requested_by_profile_id <> v_profile then
    return jsonb_build_object('ok', false, 'error', 'only_requester_can_cancel');
  end if;

  update public.business_rule_change_requests
  set status = 'REJECTED', decided_at = now(), reason = 'cancelled_by_requester'
  where id = p_request_id;

  return jsonb_build_object('ok', true, 'status', 'CANCELLED', 'request_id', p_request_id);
end;
$function$;
