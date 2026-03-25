-- Add submitted_at column to scores table if it doesn't already exist.
-- This column is referenced by all scoring insert/update calls
-- (StablefordScoringApp, lib/actions/scores.ts). Without it, inserts
-- fail silently and no scores are persisted to the database.

ALTER TABLE scores ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
