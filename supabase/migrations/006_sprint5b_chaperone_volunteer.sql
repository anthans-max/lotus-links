-- Sprint 5B: Add chaperone volunteer flag to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS willing_to_chaperone boolean DEFAULT false;
