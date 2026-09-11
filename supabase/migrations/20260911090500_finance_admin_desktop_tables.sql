-- Finance Admin desktop read model: expose wallet rows alongside deposits.
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
  v_wallets jsonb;
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
    SELECT l.id,
           l.matched_profile_id AS profile_id,
           p.username,
           p.email,
           'DEPOSIT'::text AS type,
           l.parsed_amount AS amount,
           upper(coalesce(l.status, 'PENDING')) AS status,
           l.sms_reference AS description,
           l.sender_phone,
           l.phone_normalized,
           l.created_at,
           l.processed_at AS updated_at
    FROM public.sms_deposit_logs l
    LEFT JOIN public.profiles p ON p.id = l.matched_profile_id
    ORDER BY l.created_at DESC
    LIMIT v_limit
  ) t;

  SELECT coalesce(jsonb_agg(to_jsonb(u) ORDER BY u.last_seen_at DESC), '[]'::jsonb)
  INTO v_unmatched
  FROM (
    SELECT *
    FROM public.admin_get_unregistered_senders()
    LIMIT v_limit
  ) u;

  SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.updated_at DESC), '[]'::jsonb)
  INTO v_wallets
  FROM (
    SELECT w.id, w.profile_id, p.username, p.email,
           w.balance, w.available_balance, w.reserved_balance, w.updated_at
    FROM public.wallets w
    LEFT JOIN public.profiles p ON p.id = w.profile_id
    ORDER BY w.updated_at DESC
    LIMIT v_limit
  ) w;

  SELECT jsonb_build_object(
    'wallet_count', (SELECT count(*) FROM public.wallets),
    'wallet_balance_total', coalesce((SELECT sum(balance) FROM public.wallets), 0),
    'wallet_reserved_total', coalesce((SELECT sum(reserved_balance) FROM public.wallets), 0),
    'pending_transactions', coalesce((SELECT count(*) FROM public.sms_deposit_logs WHERE upper(coalesce(status, 'PENDING')) = 'PENDING'), 0),
    'completed_deposits', coalesce((SELECT count(*) FROM public.sms_deposit_logs WHERE upper(coalesce(status, '')) IN ('COMPLETED', 'MATCHED', 'SUCCESS')), 0),
    'failed_transactions', coalesce((SELECT count(*) FROM public.sms_deposit_logs WHERE upper(coalesce(status, '')) IN ('FAILED', 'REJECTED', 'REVERSED')), 0),
    'unmatched_deposit_groups', jsonb_array_length(v_unmatched)
  ) INTO v_summary;

  RETURN jsonb_build_object(
    'ok', true,
    'role', v_role,
    'summary', v_summary,
    'recent_transactions', v_transactions,
    'unmatched_deposits', v_unmatched,
    'wallets', v_wallets,
    'generated_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.finance_admin_dashboard(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_admin_dashboard(integer) TO authenticated;
