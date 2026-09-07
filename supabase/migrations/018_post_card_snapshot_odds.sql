-- Post Card odds are immutable values chosen in the creator cart.
-- They must not be overwritten by the live ESPN odds sync.
alter table public.match_snapshots
  add column if not exists odds_home numeric(10,4),
  add column if not exists odds_draw numeric(10,4),
  add column if not exists odds_away numeric(10,4);
