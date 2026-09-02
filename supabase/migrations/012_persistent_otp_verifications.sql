-- Persistent OTP state for multi-instance Render deployments and restarts.
-- OTP values are stored as a digest, never as plaintext.
create table if not exists public.otp_verifications (
  email text primary key,
  otp_hash text not null,
  first_name text not null default '',
  expires_at timestamptz not null,
  attempts_left integer not null default 5 check (attempts_left >= 0 and attempts_left <= 5),
  last_sent_at timestamptz not null,
  resend_count integer not null default 0 check (resend_count >= 0 and resend_count <= 5),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists otp_verifications_expires_at_idx
  on public.otp_verifications (expires_at);

alter table public.otp_verifications enable row level security;

-- This table is accessed only by the server-side Supabase service role.
-- No client policies are intentionally created.
