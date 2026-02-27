-- 008: Add parent_email, tournament public_token, and player-level scores

-- ─── Players: collect parent email during registration ────────────────────────
ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_email text;

-- ─── Tournaments: UUID token for public scoring link (/t/[token]) ─────────────
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT gen_random_uuid();

-- Back-fill any existing rows that somehow got a null token
UPDATE tournaments SET public_token = gen_random_uuid() WHERE public_token IS NULL;

-- Enforce uniqueness on the token
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tournaments_public_token') THEN
    CREATE UNIQUE INDEX idx_tournaments_public_token ON tournaments(public_token);
  END IF;
END $$;

-- ─── Scores: support individual player scores (Stableford, individual stroke play)
-- Add player_id — nullable so existing group/scramble scores are unaffected
ALTER TABLE scores ADD COLUMN IF NOT EXISTS player_id uuid REFERENCES players(id) ON DELETE CASCADE;

-- Make group_id nullable — individual scores have no group
ALTER TABLE scores ALTER COLUMN group_id DROP NOT NULL;

-- Partial unique index: one score per player per hole per tournament
-- (The existing UNIQUE(group_id, tournament_id, hole_number) stays for group scores)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scores_player_hole') THEN
    CREATE UNIQUE INDEX idx_scores_player_hole
      ON scores(player_id, tournament_id, hole_number)
      WHERE player_id IS NOT NULL;
  END IF;
END $$;

-- ─── Helper: validate a public_token, return the tournament_id ────────────────
CREATE OR REPLACE FUNCTION get_tournament_id_by_token(token_val uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM tournaments WHERE public_token = token_val LIMIT 1;
$$;
