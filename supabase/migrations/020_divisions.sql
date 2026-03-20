-- 020_divisions.sql
-- Divisions for grouping teams by grade/skill in tournaments

-- Create divisions table
CREATE TABLE IF NOT EXISTS divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add division reference to groups (SET NULL so deleting a division doesn't delete groups)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES divisions(id) ON DELETE SET NULL;

-- Add results_published flag to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS results_published boolean NOT NULL DEFAULT false;

-- Indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_groups_division ON groups(division_id);
CREATE INDEX IF NOT EXISTS idx_divisions_tournament ON divisions(tournament_id);

-- RLS
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;

-- Anyone can read divisions (public leaderboard)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'divisions' AND policyname = 'divisions_select_all'
  ) THEN
    CREATE POLICY "divisions_select_all" ON divisions FOR SELECT USING (true);
  END IF;
END $$;

-- Only authenticated users can write
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'divisions' AND policyname = 'divisions_insert_auth'
  ) THEN
    CREATE POLICY "divisions_insert_auth" ON divisions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'divisions' AND policyname = 'divisions_update_auth'
  ) THEN
    CREATE POLICY "divisions_update_auth" ON divisions FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'divisions' AND policyname = 'divisions_delete_auth'
  ) THEN
    CREATE POLICY "divisions_delete_auth" ON divisions FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;
