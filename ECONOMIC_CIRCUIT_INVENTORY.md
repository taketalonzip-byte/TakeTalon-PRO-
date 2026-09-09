# TakeTalon PRO — Economic Circuit Inventory

**Audit scope:** repository `taketalonzip-byte/TakeTalon-PRO-`, current `main` commit `e2ca231`, and live Supabase project `jrefgmvoosyxxjyhnycx` (`jrefgmvoosyxxjyhnycx`). This is an inventory of every identified monetary, wallet, price, fee, commission, stake, deposit, withdrawal, and ledger-related component. No code or database changes were made during this audit.

## Executive finding

TakeTalon PRO currently has two economic architectures. The first is a database-backed **Unlocker commission circuit**. It uses `business_rules`, wallet balances, reserved balances, wallet ledgers, unlock contracts, and the server-side `process_due_unlock_payments()` function. The second consists of several **frontend-controlled or simulated money flows**, including Aviator, Jackpot, Slot777, PRO upgrade, withdrawal display, Agent simulation, and some deposit confirmation behavior. These flows should not be treated as equally authoritative until each is verified against a server-side transaction/RPC.

## 1. Database-backed economic circuit

| Area | Source | Logic / values | Authority |
|---|---|---|---|
| Unlock monthly price paid by X | Live `public.business_rules.unlock_price_x_month`; migration 020 / related unlock functions | Current live value: **500 FBU/month** before `pricing_scale_factor` | Database |
| Unlock monthly amount received by Y | Live `public.business_rules.unlock_price_y_month` | Current live value: **450 FBU/month** | Database |
| Platform commission | Live `public.business_rules.commission_month` | Current live value: **0.1000 = 10%**; platform receives 10%, Y receives 90% | Database |
| Global price scaling | Live `public.business_rules.pricing_scale_factor` | Current live value: **1.0000**; scales unlock prices | Database |
| Payment interval | Live `public.business_rules.interval_minutes` | Current live value: **30 minutes** between due payments | Database |
| Unlock request | `public.request_unlock(uuid)` and `server.ts` `/api/supabase/request-unlock` | Requires active `professional_accounts`; prevents self-unlock and duplicate active/pending contracts | Database + server |
| Unlock acceptance | `public.accept_unlock(uuid)` | Checks the unlocked party, pending status, price, wallet availability, and reserves/activates payment state | Database |
| Due commission payment | `public.process_due_unlock_payments()` | Calculates X monthly price, platform commission, Y share, per-interval amounts, locks wallets, updates balances, writes wallet ledger entries, and increments contract intervals | Database scheduled/function path |
| Unlock cancellation | `public.cancel_unlock(uuid)` | Cancels pending/active contracts and releases reserved amount where applicable | Database |
| Unlock rejection | `public.reject_unlock(uuid)` | Rejects a pending unlock request | Database |
| Unlock records | `public.unlock_contracts` | 5 live rows; tracks status, expiry, last charge, intervals charged, and reserved amount | Database |

### Commission formula found

The live function `process_due_unlock_payments()` uses the equivalent of:

```text
x_month_effective = unlock_price_x_month * pricing_scale_factor
a = x_month_effective * commission_month
Y monthly share = x_month_effective - platform commission
per-interval values = monthly values / periods per month
```

The live business-rule description explicitly says the platform receives `commission_month`, while Y receives `(1 - commission_month)` of the total price.

## 2. Wallet and ledger system

| Component | Source / table | Details |
|---|---|---|
| User wallet | `public.wallets` | Columns: `balance`, `reserved_balance`, generated `available_balance = balance - reserved_balance`; balance and reserved balance have non-negative checks |
| Wallet ledger | `public.wallet_ledgers` | Columns: `amount`, `balance_before`, `balance_after`, `entry_type`, references; allowed entry types: `deposit`, `withdrawal`, `unlock_charge`, `unlock_credit`, `commission`, `reserve`, `release`, `adjustment` |
| Platform wallet | `public.platform_wallet` | Single-row platform balance; currently 0 rows in live inspection |
| Wallet integrity | `public.verify_wallet_integrity(uuid)` | Compares stated wallet balance against sum of ledger amounts |
| Automatic wallet creation | `server.ts` login/profile lookup and unlock paths | Creates wallet with balance 0 and reserved balance 0 if absent |
| Server unlock debit | `server.ts` around the request-unlock flow | Updates unlocker balance and writes negative `unlock_charge` ledger entry |
| Server unlock credit | `server.ts` around the request-unlock flow | Updates tipster/unlocked balance and writes positive `unlock_credit` ledger entry |

## 3. Deposits and SMS money recognition

| Area | Source | Logic / values | Risk / status |
|---|---|---|---|
| SMS parser | `server.ts` around lines 500–800 | Parses sender phone, amount, transaction/provider reference, and validity | Input parsing; must be followed by verified provider handling |
| SMS deposit RPC | `public.process_sms_deposit(...)` | Rejects null/non-positive amount, protects against duplicate references, normalizes phone, matches profile, updates wallet and ledger | Database-backed |
| SMS deposit logs | `public.sms_deposit_logs` | Stores raw SMS, phone, parsed amount, reference, profile match, status, ledger ID, provider-format flag | Live table exists; 0 rows in audit snapshot |
| Legacy SMS deposit path | `public.process_sms_deposit(text,text,text,numeric,text)` and `public.sms_deposits` references | Another overload exists in live functions and migration history | Requires consolidation review; duplicate function families can cause ambiguity |
| Admin unmatched deposits | `public.admin_get_unmatched_sms_deposits()` | Allows `ADMIN`/`SUPER_ADMIN` to inspect unmatched SMS deposits | `OWNER` is not included in this function's role allow-list |
| Unregistered sender reconciliation | `public.admin_get_unregistered_senders()` and `admin_reconcile_unregistered_sender(text,uuid)` | Aggregates unmatched amounts and credits a selected profile wallet | Allow-list currently uses `ADMIN`/`SUPER_ADMIN`, not `OWNER` |
| Admin reconciliation tables | `public.unregistered_senders`, `public.sms_deposit_logs` | Track unmatched amounts, reconciliation profile, and deposit status | Financially sensitive |
| Deposit UI | `src/components/DepositPage.tsx` | Polls verification, uses matched SMS amount; fallback amount values of **1,000 FBU** appear in UI logic | Frontend behavior; verify server result is authoritative |
| Deposit reporting | `server.ts` `/api/deposit/report`, `src/components/ReportProblemView.tsx` | Stores/report messages for deposit issues; sample text uses **10,000 FBU** | Reporting only, not a balance mutation |
| Gemini deposit assistant | `server.ts` `/api/deposit/gemini-ask` | Explains deposit flow | Informational, not a payment processor |

## 4. Withdrawals

| Area | Source | Logic / values | Status |
|---|---|---|---|
| Withdrawal UI amount | `src/components/WalletView.tsx` line ~598 | Default withdrawal amount **5,000 FBU** | Frontend default |
| Withdrawal UI validation | `WalletView.tsx` lines ~624–649 | Checks `userBalance < withdrawAmount`, optimistically subtracts balance, calls `/api/supabase/wallet-withdraw`, restores balance on failure | Must be checked for a server route/RPC; optimistic UI is not authoritative |
| Withdrawal API call | `WalletView.tsx` line ~636 | POST `/api/supabase/wallet-withdraw` with `profile_id` and `amount` | Endpoint should be audited separately; it was not found in the first route-name scan of `server.ts`, which is a potential gap |
| Test withdrawal RPC | Live `public.test_self_withdraw(numeric)` | Enabled only when `business_rules.test_mode_enabled = 1`; rejects non-positive amount and checks available balance | Current live `test_mode_enabled = 1`, therefore test self-withdraw is enabled |
| Test-mode warning | Live `business_rules.test_mode_enabled` | Description says set to 0 before production launch to disable `test_self_deposit/withdraw` | **Production risk:** current live value is 1 |

## 5. Self-test deposits and caps

| Rule | Source | Current value / behavior |
|---|---|---|
| Test mode | `business_rules.test_mode_enabled` | Live value **1.0000** |
| Test deposit per-request cap | `public.test_self_deposit(numeric)` | **50,000 FBU** per request |
| Test deposit daily cap | `public.test_self_deposit(numeric)` | **200,000 FBU** per day |
| Test deposit validation | `public.test_self_deposit(numeric)` | Positive amount required; test mode must be enabled |
| Test withdrawal validation | `public.test_self_withdraw(numeric)` | Positive amount required; wallet and available balance checked |

## 6. Sports, casino, and game money logic

### Sports / betting

The repository contains odds, fixtures, match snapshots, cards, and prediction/unlock functionality. In the initial scan, the main sports match/odds modules did **not** expose a clearly server-authoritative cash stake settlement circuit comparable to the unlock ledger. The following economic-adjacent areas were found:

- `src/components/AviatorGame.tsx`: default `betAmount = 2,000 FBU`; win calculation uses `placedBetAmount * currentMultiplier` and floor rounding. This appears primarily frontend/game-state logic and requires server settlement verification.
- `src/components/BettingSlip.tsx` and related match/card components: odds, selections, card prices, and user balance references are present; a complete backend wallet debit/credit circuit was not identified in the first route scan.
- `src/lib/casino/provablyFair.ts`: `MAX_BET_FBU = 100,000`.
- `src/components/jackpot/JackpotWheelGame.tsx`: `BET_PER_SPIN = 200 FBU` fixed per spin.
- `src/components/games/Slot777.tsx`: adjustable bet amount logic; exact settlement authority needs separate trace.
- `src/components/CasinoProGame.tsx`: computes `netChange = payoutFBU - amountFBU` in the client.

**Important:** these game values are not the same as a minimum deposit. They are stake/default/max-bet values. They must be distinguished from actual wallet mutations.

### Pro / subscription economics

| Area | Source | Value / logic |
|---|---|---|
| PRO upgrade | `src/components/WalletView.tsx` around lines 679–690 | `upgradeCost = 15,000 FBU`; client subtracts balance and records `UPGRADE_PRO` transaction |
| PRO display price | `WalletView.tsx` around lines 1000–1002 | Shows original **30,000 FBU** crossed out and current **15,000 FBU** |
| Tipster monthly price | `src/components/TipstersList.tsx`, `src/components/PublicProfilePage.tsx` | Reads `businessRules.monthly_cost_fbu`; this key was not among the live `business_rules` rows returned in the audit, so fallback/source should be checked |
| Professional account | `public.professional_accounts` | `active`/`suspended`; required by `request_unlock` |

## 7. Agent / commission simulation

| Source | Logic / values | Status |
|---|---|---|
| `src/components/AgentView.tsx` | Default simulated amount **2,000 FBU**; UI says **1,000 FBU** needed to join agent; parses SMS amount and calculates expected system balance | Appears simulation/UI logic; requires backend settlement audit |
| `src/components/HelpView.tsx` | Describes CEO accounts, unlockers, and **90/10 revenue split** | Documentation/UI, but consistent with 10% `commission_month` and 90% recipient share |
| `business_rules.commission_month` | Live **0.10** | Database source of commission rate for unlock payments |

## 8. Profile-photo economics

| Source | Logic / values |
|---|---|
| `supabase/migrations/004_profile_photos_schema.sql` | Documents server-enforced pricing: **500 FBU** new profile photo, **300 FBU** switching existing photo, **0 FBU** delete, **100 FBU** restore |
| `public.profile_photo_transactions` | Stores action, amount, currency (`FBu`), user and photo references |
| `server.ts` routes around lines 2287–2646 | History, upload, switch, delete, restore routes; the server route scan shows several transaction amount fields, including 0 values; exact debit enforcement should be checked against the live table/function definitions |
| `src/components/ProfileView.tsx` | UI says profile-photo changes are **100% FREE**, which conflicts with migration documentation unless the paid operations were removed or bypassed |

## 9. Live business-rule values

The live `public.business_rules` audit returned:

| Key | Value | Meaning |
|---|---:|---|
| `commission_month` | `0.1000` | 10% platform commission |
| `interval_minutes` | `30` | Unlock payment interval |
| `pricing_scale_factor` | `1.0000` | Global unlock price multiplier |
| `test_mode_enabled` | `1.0000` | Test deposit/withdraw currently enabled |
| `tva_rate` | `0.0000` | Government TVA currently unused |
| `unlock_price_x_month` | `500` | X's monthly unlock price |
| `unlock_price_y_month` | `450` | Y's monthly receipt |
| OTP-related keys | 3, 5, 10, 60, etc. | Security/time limits, not economic amounts |

## 10. Tables with economic significance found live

- `wallets`
- `wallet_ledgers`
- `platform_wallet`
- `professional_accounts`
- `business_rules`
- `business_rules_audit_log`
- `unlock_contracts`
- `sms_deposit_logs`
- `sms_deposits` / legacy SMS-deposit function references
- `unregistered_senders`
- `profile_photo_transactions`
- `profile_photos`
- `audit_logs`
- `security_audit_log`
- `profiles` (role and account ownership affect financial administration)

Live row-count snapshot during this audit: `wallets` 1, `wallet_ledgers` 0, `platform_wallet` 0, `professional_accounts` 0, `unlock_contracts` 5, `sms_deposit_logs` 0, `business_rules_audit_log` 0, `security_audit_log` 16.

## 11. Most important gaps and inconsistencies

1. **Test mode is enabled in production** (`test_mode_enabled = 1`), allowing test self-deposit/withdraw functions unless separately blocked by deployment policy.
2. **Owner role is not included in several financial-admin RPC allow-lists.** `admin_get_unmatched_sms_deposits()`, `admin_get_unregistered_senders()`, and `admin_reconcile_unregistered_sender()` explicitly allow `ADMIN`/`SUPER_ADMIN`, not `OWNER`. This can reproduce the same authority problem seen earlier, but in finance operations.
3. **Frontend financial mutations are optimistic or client-controlled in multiple places.** PRO upgrade, withdrawal display, Aviator, CasinoPro, Jackpot, and Agent simulation require confirmation that every balance mutation has a server/RPC equivalent.
4. **Withdrawal endpoint mismatch requires investigation.** `WalletView.tsx` calls `/api/supabase/wallet-withdraw`, but the first backend route scan did not find that route by name in `server.ts`.
5. **Profile-photo pricing conflicts.** Migration documentation specifies 500/300/0/100 FBU actions, while the UI says profile-photo changes are free.
6. **Two SMS deposit function families exist in the live database.** The overloads should be consolidated or explicitly deprecated to prevent different paths from applying different accounting behavior.
7. **`platform_wallet` has no live rows** in the snapshot, although the unlock commission logic and ledger types imply platform revenue accounting.
8. **`monthly_cost_fbu` is referenced by frontend components but was not returned among the current live `business_rules` rows**, so its fallback and source need verification.

## 12. Recommended next audit order

1. Trace every endpoint/RPC that can mutate `wallets.balance`, `wallets.reserved_balance`, `wallet_ledgers`, or `platform_wallet`.
2. Disable test mode in production only after confirming no legitimate test workflow depends on it.
3. Decide whether `OWNER` should be added to financial-admin read/reconciliation allow-lists, with explicit separation between read, reconcile, approve, and payout powers.
4. Move every game/pro/withdrawal balance mutation behind server-side transactional functions with idempotency keys and ledger entries.
5. Reconcile profile-photo pricing and remove either the stale migration rules or the contradictory free UI.
6. Add a single canonical economic-rules registry and audit trail for all minimums, maximums, fees, commissions, and prices.

## Files most relevant for the next pass

- `server.ts`
- `src/components/WalletView.tsx`
- `src/components/DepositPage.tsx`
- `src/components/AgentView.tsx`
- `src/components/AviatorGame.tsx`
- `src/components/CasinoProGame.tsx`
- `src/components/jackpot/JackpotWheelGame.tsx`
- `src/components/games/Slot777.tsx`
- `src/components/ProfileView.tsx`
- `src/components/TipstersList.tsx`
- `supabase/migrations/001_sms_forwarder_schema.sql`
- `supabase/migrations/002_unregistered_senders_schema.sql`
- `supabase/migrations/004_profile_photos_schema.sql`
- `supabase/migrations/020_owner_bootstrap_three_approvals.sql`
- live functions `process_due_unlock_payments`, `accept_unlock`, `cancel_unlock`, `process_sms_deposit`, `test_self_deposit`, `test_self_withdraw`, and `verify_wallet_integrity`

**Conclusion:** The most trustworthy current circuit is the unlock/commission path because it is expressed through database rules, wallet locks, and ledger entries. The biggest financial-control risks are enabled test mode, owner exclusion from financial-admin RPCs, client-side game/PRO/withdrawal mutations, and inconsistent/stale pricing definitions.

---

*Generated from repository and live Supabase inspection on 2026-09-09. This report is an inventory, not a financial reconciliation or production change plan.*
