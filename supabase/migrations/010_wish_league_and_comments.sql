-- 010: WISH league type flag, registration comments, and handicap_index
-- All statements are idempotent (IF NOT EXISTS / safe defaults).

-- ─── Leagues: league_type for feature-gating WISH-specific UI ─────────────────
-- 'standard' = normal golf league, 'wish' = WISH Charter School league
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS league_type varchar(50) NOT NULL DEFAULT 'standard';

-- ─── Players: optional free-text comments captured during registration ─────────
-- WISH-specific field; NULL for all non-WISH registrations.
ALTER TABLE players ADD COLUMN IF NOT EXISTS registration_comments text;

-- ─── Players: Handicap Index for non-WISH (general golf) leagues ───────────────
-- Stored as numeric(5,1) to support values like -10.0 to 54.0.
-- Separate from the existing integer `handicap` column to preserve backward compat.
ALTER TABLE players ADD COLUMN IF NOT EXISTS handicap_index numeric(5,1);
