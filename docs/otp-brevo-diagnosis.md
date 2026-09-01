# OTP/Brevo production diagnosis

- Render service: `TakeTalon-PRO-`
- Production URL: https://taketalon-pro.onrender.com
- Render logs at 2026-09-01 showed: `[OTP-SERVICE] Email dispatch failed: fetch failed` after the service was live.
- Direct Brevo account check with the Brevo key returned HTTP 200, confirming the Brevo key itself was valid.
- The earlier direct check that returned HTTP 401 used the Supabase key by mistake and is not evidence against Brevo.
- The OTP implementation used Node/global `fetch` to `https://api.brevo.com/v3/smtp/email`.
- A fallback was implemented in `server.ts` using Node `https.request`, with a 20-second timeout and bounded error-body logging.
- Commit `a6210d8` (`fix: use reliable HTTPS transport for OTP email`) was pushed to `main`.
- Render auto-deployed commit `a6210d8`; build succeeded and service became live.
- Production health returned HTTP 200 with `dbConnected: true`.
- Production OTP smoke test returned HTTP 200 and JSON `success: true`, confirming the HTTPS fallback worked.
- Supabase admin issue: Render needed `SUPABASE_SERVICE_ROLE_KEY`; it was added to Render Environment and deployment `dep-dab5c549v7es73c36kb0` succeeded.
- Latest user report was an OTP failure before the HTTPS fallback deployment; current post-fallback smoke test is successful.
- Do not include or store actual API key values in this note.

Source URL: https://dashboard.render.com/web/srv-daapq0gae00c73eupdv0/logs
Production URL: https://taketalon-pro.onrender.com
GitHub repository: https://github.com/taketalonzip-byte/TakeTalon-PRO-
GitHub commit: https://github.com/taketalonzip-byte/TakeTalon-PRO-/commit/a6210d8
Supabase project_id: jrefgmvoosyxxjyhnycx

Register/profile follow-up findings:
- `AuthPage.tsx` had only React state for registration fields and `resetForm()` cleared all fields.
- No localStorage/sessionStorage draft persistence existed.
- `/create-account` sends first_name, last_name, phone, gender, birthday, terms_accepted, and password.
- The server currently swallows Supabase admin/profile upsert errors and can return success even if profile persistence fails; this is a candidate fix for NULL profile fields.
- Login/profile loading reads `profiles.first_name` and `profiles.last_name`.
- A register draft persistence patch was started but is not yet committed/deployed; it excludes password, retype-password, and OTP code and should be cleared only after successful account creation.
- Need verify TypeScript/build after the draft patch before deployment.

Recorded: 2026-09-01
Author: Manus AI

# References

- [Render application logs](https://dashboard.render.com/web/srv-daapq0gae00c73eupdv0/logs)
- [TakeTalon production](https://taketalon-pro.onrender.com)
- [GitHub commit a6210d8](https://github.com/taketalonzip-byte/TakeTalon-PRO-/commit/a6210d8)
- [GitHub repository](https://github.com/taketalonzip-byte/TakeTalon-PRO-)
