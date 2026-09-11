-- TakeTalon PRO — Finance Admin Portal read model
-- Uses the canonical admin_get_unregistered_senders() read RPC already present
-- in the Cloudflare migration chain. No direct balance mutation is exposed.

CREATE OR REPLACE FUNCTION public.finance_admin_dashboard(p_limit integer DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_role text;
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 100));
  v_summary jsonb;
  v_transactions jsonb;
  v_unmatched jsonb;
BEGIN
  SELECT upper(role) INTO v_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_role NOT IN ('ADMIN', 'SUPER_ADMIN', 'OWNER') THEN
    RAISE EXCEPTION 'finance_admin_access_denied';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_transactions
  FROM (
    SELECT t.id, t.profile_id, p.username, p.email, t.type, t.amount, t.status,
           t.description, t.created_at, t.updated_at
    FROM public.transactions t
    LEFT JOIN public.profiles p ON p.id = t.profile_id
    ORDER BY t.created_at DESC
    LIMIT v_limit
  ) t;

  -- Keep the portal compatible with the current Cloudflare canonical sender
  -- read model instead of querying the retired SMS table directly.
  SELECT coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb)
  INTO v_unmatched
  FROM (
    SELECT *
    FROM public.admin_get_unregistered_senders()
    LIMIT v_limit
  ) u;

  SELECT jsonb_build_object(
    'wallet_count', (SELECT count(*) FROM public.wallets),
    'wallet_balance_total', coalesce((SELECT sum(balance) FROM public.wallets), 0),
    'wallet_reserved_total', coalesce((SELECT sum(reserved_balance) FROM public.wallets), 0),
    'pending_transactions', coalesce((SELECT count(*) FROM public.transactions WHERE upper(status) = 'PENDING'), 0),
    'completed_deposits', coalesce((SELECT count(*) FROM public.transactions WHERE upper(type) = 'DEPOSIT' AND upper(status) = 'COMPLETED'), 0),
    'failed_transactions', coalesce((SELECT count(*) FROM public.transactions WHERE upper(status) IN ('FAILED', 'REVERSED')), 0),
    'unmatched_deposit_groups', jsonb_array_length(v_unmatched)
  ) INTO v_summary;

  RETURN jsonb_build_object(
    'ok', true,
    'role', v_role,
    'summary', v_summary,
    'recent_transactions', v_transactions,
    'unmatched_deposits', v_unmatched,
    'generated_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.finance_admin_dashboard(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_admin_dashboard(integer) TO authenticated;
