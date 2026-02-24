-- Sprint 3: Scoring & Leaderboard
-- Run this in the Supabase SQL Editor

-- ─── Groups: track current hole for live progress ──────────────────────────────
ALTER TABLE groups ADD COLUMN IF NOT EXISTS current_hole integer DEFAULT 1;

-- ─── Tournaments: admin toggle for public leaderboard ──────────────────────────
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS leaderboard_public boolean DEFAULT false;

-- ─── RLS policies for scoring (public access — chaperones have no auth) ────────
-- Scores need public read/write for chaperone entry and leaderboard display

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE holes ENABLE ROW LEVEL SECURITY;

-- Scores: public read (leaderboard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view scores') THEN
    CREATE POLICY "Public can view scores" ON scores FOR SELECT USING (true);
  END IF;
END $$;

-- Scores: public insert (chaperone score entry)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert scores') THEN
    CREATE POLICY "Public can insert scores" ON scores FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Scores: public update (chaperone correcting a score)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can update scores') THEN
    CREATE POLICY "Public can update scores" ON scores FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Scores: public delete (admin score correction)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can delete scores') THEN
    CREATE POLICY "Public can delete scores" ON scores FOR DELETE USING (true);
  END IF;
END $$;

-- Groups: public read (chaperone needs to see group info)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view groups') THEN
    CREATE POLICY "Public can view groups" ON groups FOR SELECT USING (true);
  END IF;
END $$;

-- Groups: public update (update current_hole, status)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can update groups') THEN
    CREATE POLICY "Public can update groups" ON groups FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Holes: public read (chaperone needs hole info for scoring)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view holes') THEN
    CREATE POLICY "Public can view holes" ON holes FOR SELECT USING (true);
  END IF;
END $$;

-- Group players: public read (chaperone see players in group)
ALTER TABLE group_players ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view group_players') THEN
    CREATE POLICY "Public can view group_players" ON group_players FOR SELECT USING (true);
  END IF;
END $$;

-- ─── Enable Realtime on scores table ───────────────────────────────────────────
-- This powers the live leaderboard. Run in SQL editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE scores;
-- (Note: this may already be enabled; if it errors, it's already done)
