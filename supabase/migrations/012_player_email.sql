-- Migration 012: Add optional player_email field to players table
-- Used for non-WISH leagues to send scoring links directly to players.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS player_email TEXT DEFAULT NULL;
