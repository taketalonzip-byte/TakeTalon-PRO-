-- TakeTalon PRO — durable Card Bet identity
-- A published Post Card is reconstructed from this canonical ID and its snapshot.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS card_bet_id text;

ALTER TABLE public.match_snapshots
  ADD COLUMN IF NOT EXISTS card_bet_id text;

UPDATE public.match_snapshots
SET card_bet_id = external_match_id
WHERE card_bet_id IS NULL;

UPDATE public.posts p
SET card_bet_id = s.card_bet_id
FROM public.match_snapshots s
WHERE s.post_id = p.id
  AND p.card_bet_id IS NULL;

ALTER TABLE public.posts
  ALTER COLUMN card_bet_id SET NOT NULL;

ALTER TABLE public.match_snapshots
  ALTER COLUMN card_bet_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_card_bet_id
  ON public.posts(card_bet_id);

CREATE INDEX IF NOT EXISTS idx_match_snapshots_card_bet_id
  ON public.match_snapshots(card_bet_id);

COMMENT ON COLUMN public.posts.card_bet_id IS
  'Canonical Card Bet ID used to reconstruct the published card history.';
COMMENT ON COLUMN public.match_snapshots.card_bet_id IS
  'Canonical Card Bet ID copied from the source Card Bet.';
