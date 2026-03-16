-- Migration 016: support multiple chaperones per group and track email sends
-- The chaperones table already exists (from 014); we're adding two columns.

-- group_id: directly links a chaperone to a specific group (nullable — existing
--           chaperones in the registry have no group_id; inline-added ones do)
ALTER TABLE chaperones
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE CASCADE;

-- token_sent_at: timestamp of when the scoring-link email was last sent to this chaperone
ALTER TABLE chaperones
  ADD COLUMN IF NOT EXISTS token_sent_at timestamptz;

-- Index for fast lookup of all chaperones belonging to a group
CREATE INDEX IF NOT EXISTS idx_chaperones_group_id ON chaperones(group_id);
