-- Classify existing financial rules so Owner/SuperAdmin can see every
-- configured transaction group without exposing authentication safeguards.
UPDATE public.business_rules
SET category = 'ACCESS', control_mode = CASE
  WHEN key IN ('commission_month', 'pricing_scale_factor') THEN 'SCALE'
  WHEN key = 'interval_minutes' THEN 'LIMIT'
  ELSE 'DIRECT'
END,
version = version + 1,
updated_at = now()
WHERE key IN ('unlock_price_x_month', 'unlock_price_y_month', 'pricing_scale_factor', 'commission_month', 'interval_minutes');

-- Keep authentication, OTP, and tax placeholders visible as SYSTEM/read-only.
UPDATE public.business_rules
SET category = 'SYSTEM', control_mode = 'DIRECT',
version = version + 1, updated_at = now()
WHERE key IN ('otp_expiry_minutes', 'otp_max_attempts', 'otp_max_resends', 'otp_provider', 'otp_requests_per_hour_limit', 'otp_resend_cooldown_seconds', 'tva_rate');
