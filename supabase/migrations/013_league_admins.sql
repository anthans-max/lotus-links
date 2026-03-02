-- Migration 013: Multi-admin support for leagues
-- Replaces single admin_email on leagues with a league_admins junction table.

CREATE TABLE league_admins (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id   UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  invited_by  TEXT,
  UNIQUE (league_id, email)
);

-- Seed existing leagues — create an owner row for each existing admin_email
INSERT INTO league_admins (league_id, email, role, accepted_at)
SELECT id, admin_email, 'owner', NOW()
FROM leagues
WHERE admin_email IS NOT NULL AND admin_email != '';
