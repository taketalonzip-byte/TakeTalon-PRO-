-- Owner bootstrap: nominate a new Owner when none exists.
-- The proposer counts as the first approval; the remaining two Super Admins must approve.
ALTER TABLE public.ownership_proposals
  ADD COLUMN IF NOT EXISTS reason text;

DROP FUNCTION IF EXISTS public.superadmin_propose_emergency_removal(uuid);

CREATE OR REPLACE FUNCTION public.superadmin_propose_emergency_removal(
  p_new_owner_profile_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_proposal_id uuid;
  v_current_owner_id uuid;
begin
  select id, role into v_caller_id, v_caller_role
  from public.profiles
  where auth_user_id = auth.uid();

  if v_caller_role is distinct from 'SUPER_ADMIN' then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  if p_reason is null or length(trim(p_reason)) < 5 then
    return jsonb_build_object('ok', false, 'error', 'reason_required');
  end if;

  if not exists (select 1 from public.profiles where id = p_new_owner_profile_id) then
    return jsonb_build_object('ok', false, 'error', 'new_owner_not_found');
  end if;

  select id into v_current_owner_id
  from public.profiles
  where role = 'OWNER'
  limit 1;

  insert into public.ownership_proposals
    (proposal_type, proposed_by_profile_id, target_new_owner_id,
     target_old_owner_id, required_approvals, reason)
  values
    ('emergency_owner_removal', v_caller_id, p_new_owner_profile_id,
     v_current_owner_id, 3, trim(p_reason))
  returning id into v_proposal_id;

  -- The initiating Super Admin is the first of three required approvals.
  insert into public.ownership_approvals (proposal_id, approver_profile_id)
  values (v_proposal_id, v_caller_id);

  insert into public.security_audit_log
    (event_type, actor_profile_id, target_profile_id, details)
  values
    ('ownership_proposal_created', v_caller_id, p_new_owner_profile_id,
     jsonb_build_object(
       'proposal_id', v_proposal_id,
       'type', 'emergency_owner_removal',
       'reason', trim(p_reason),
       'required_approvals', 3
     ));

  return jsonb_build_object(
    'ok', true,
    'proposal_id', v_proposal_id,
    'approvals_so_far', 1,
    'needed', 3
  );
end;
$function$;
