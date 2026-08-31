-- Enable pg_net for the production live-sync cron job.
-- The extension is used only for outbound HTTP invocation of the protected Edge Function.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
