-- Align read-only admin SMS RPCs with the OWNER authorization used by reconciliation.
-- No wallet, ledger, deposit, or public/anon privilege changes are made.

CREATE OR REPLACE FUNCTION public.admin_get_unmatched_sms_deposits()
RETURNS TABLE (
  id uuid,
  sender_phone text,
  phone_normalized text,
  parsed_amount numeric,
  sms_reference text,
  status text,
  raw_sms_text text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.id, l.sender_phone, l.phone_normalized, l.parsed_amount,
         l.sms_reference, l.status, l.raw_sms_text, l.created_at
  FROM public.sms_deposit_logs l
  WHERE l.status <> 'matched'
    AND COALESCE((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()), '')
      IN ('ADMIN', 'SUPER_ADMIN', 'OWNER')
  ORDER BY l.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_unregistered_senders()
RETURNS SETOF public.unregistered_senders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT *
  FROM public.unregistered_senders
  WHERE reconciled_profile_id IS NULL
    AND COALESCE((SELECT role FROM public.profiles WHERE auth_user_id = auth.uid()), '')
      IN ('ADMIN', 'SUPER_ADMIN', 'OWNER')
  ORDER BY total_unmatched_amount DESC;
$function$;
