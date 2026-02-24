-- Sprint 2: Player registration, pairing preferences, and RLS policies
-- Run this in the Supabase SQL Editor

-- ─── Players: add registration fields ──────────────────────────────────────────
ALTER TABLE players ADD COLUMN IF NOT EXISTS status text DEFAULT 'pre-registered';
-- status values: 'pre-registered' (admin added), 'registered' (parent confirmed), 'checked_in' (tournament day)

ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_name text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS parent_phone text;
ALTER TABLE players ADD COLUMN IF NOT EXISTS registered_at timestamptz;

-- ─── Pairing preferences table ─────────────────────────────────────────────────
-- Stores which players want to be grouped with whom (for parent registration)
CREATE TABLE IF NOT EXISTS pairing_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  preferred_player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id, preferred_player_id)
);

-- ─── Groups: ensure columns exist (may already exist from Sprint 1) ────────────
ALTER TABLE groups ADD COLUMN IF NOT EXISTS starting_hole integer DEFAULT 1;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS tee_time time;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS status text DEFAULT 'not_started';

-- ─── RLS Policies for public registration page ─────────────────────────────────
-- These are permissive for MVP. Tighten post-launch.

-- Enable RLS on tables that need public access
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Allow public read access to players (for registration page player list)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view tournament players') THEN
    CREATE POLICY "Public can view tournament players" ON players FOR SELECT USING (true);
  END IF;
END $$;

-- Allow public to update player registration status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can register players') THEN
    CREATE POLICY "Public can register players" ON players FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Allow public to insert new players (for "I don't see my child" flow)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can add players') THEN
    CREATE POLICY "Public can add players" ON players FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Allow public to insert pairing preferences
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert pairing preferences') THEN
    CREATE POLICY "Public can insert pairing preferences" ON pairing_preferences FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Allow public to read pairing preferences (for checking existing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view pairing preferences') THEN
    CREATE POLICY "Public can view pairing preferences" ON pairing_preferences FOR SELECT USING (true);
  END IF;
END $$;

-- Allow public to delete pairing preferences (for updating preferences)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can delete pairing preferences') THEN
    CREATE POLICY "Public can delete pairing preferences" ON pairing_preferences FOR DELETE USING (true);
  END IF;
END $$;

-- Allow public to read tournaments (for registration page header)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view tournaments') THEN
    CREATE POLICY "Public can view tournaments" ON tournaments FOR SELECT USING (true);
  END IF;
END $$;

-- Allow authenticated users full access (admin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access players') THEN
    CREATE POLICY "Authenticated full access players" ON players FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access pairing_preferences') THEN
    CREATE POLICY "Authenticated full access pairing_preferences" ON pairing_preferences FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated full access tournaments') THEN
    CREATE POLICY "Authenticated full access tournaments" ON tournaments FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
