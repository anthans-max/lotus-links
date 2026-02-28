-- Migration 011: Handicap-adjusted scoring & configurable Stableford points
-- Run in Supabase SQL editor

-- Add course handicap inputs (slope + rating) to tournaments
-- Default slope 113 = standard/flat course per USGA
-- course_rating defaults NULL — set per course (use par as fallback in app code)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS slope_rating  NUMERIC(4,1) DEFAULT 113,
  ADD COLUMN IF NOT EXISTS course_rating NUMERIC(4,1) DEFAULT NULL;

-- Add configurable Stableford points per outcome tier
-- Stored as JSONB for grouped config ergonomics
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS stableford_points_config JSONB DEFAULT NULL;

-- Provide a comment so future devs know the expected shape
COMMENT ON COLUMN tournaments.stableford_points_config IS
  'Configurable Stableford point values per net outcome. Expected keys: double_bogey_or_worse, bogey, par, birdie, eagle, albatross. Null = use app defaults.';
