-- Align the existing OTP table with the application persistence contract.
-- The production database already had an older otp_verifications shape, so
-- CREATE TABLE IF NOT EXISTS did not add the newer columns.
alter table public.otp_verifications
  add column if not exists first_name text not null default '',
  add column if not exists attempts_left integer not null default 5,
  add column if not exists verified boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.otp_verifications
  alter column purpose set default 'registration',
  alter column max_attempts set default 5,
  alter column max_resends set default 5;

update public.otp_verifications
set attempts_left = greatest(0, max_attempts - attempts),
    verified = verified_at is not null,
    updated_at = coalesce(updated_at, created_at, now())
where attempts_left is null or attempts_left > max_attempts or verified is distinct from (verified_at is not null);

alter table public.otp_verifications
  add constraint otp_verifications_attempts_left_check check (attempts_left >= 0 and attempts_left <= max_attempts);

notify pgrst, 'reload schema';
