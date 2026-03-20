-- Migration 019: Volunteer sign-up table
-- Public sign-up form for tournament day volunteers

CREATE TABLE IF NOT EXISTS volunteers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  roles TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tournament lookups
CREATE INDEX idx_volunteers_tournament_id ON volunteers(tournament_id);

-- Prevent duplicate sign-ups (same email per tournament)
CREATE UNIQUE INDEX idx_volunteers_unique_email ON volunteers(tournament_id, email);

-- RLS
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Public can insert (sign-up form is unauthenticated)
CREATE POLICY "Anyone can sign up as volunteer"
  ON volunteers FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (admins) can view volunteers
CREATE POLICY "Authenticated users can view volunteers"
  ON volunteers FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can delete volunteers
CREATE POLICY "Authenticated users can delete volunteers"
  ON volunteers FOR DELETE
  USING (auth.role() = 'authenticated');
