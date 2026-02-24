-- Sprint 1: Add missing columns to existing tables
-- Run this in the Supabase SQL Editor

-- ─── Groups: add starting hole, tee time, status ────────────────────────────
ALTER TABLE groups ADD COLUMN IF NOT EXISTS starting_hole integer DEFAULT 1;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS tee_time time;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS status text DEFAULT 'not_started';

-- ─── Scores: add entered_by for audit trail ─────────────────────────────────
ALTER TABLE scores ADD COLUMN IF NOT EXISTS entered_by text;

-- ─── Tournaments: add shotgun_start flag ─────────────────────────────────────
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS shotgun_start boolean DEFAULT false;

-- ─── Scores: unique constraint (one score per group per hole per tournament) ─
-- This prevents duplicate score entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_group_hole'
  ) THEN
    ALTER TABLE scores ADD CONSTRAINT unique_group_hole
      UNIQUE (group_id, tournament_id, hole_number);
  END IF;
END $$;
