-- Migration 014: Chaperone management + token-based scoring URLs
-- Run in Supabase SQL editor

-- ─── Chaperone registry per tournament ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chaperones (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid       NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          text       NOT NULL,
  email         text,
  phone         text,
  role          text       NOT NULL DEFAULT 'parent',  -- 'parent' | 'coach' | 'volunteer'
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── One formal chaperone assigned per group ───────────────────────────────────
CREATE TABLE IF NOT EXISTS group_chaperones (
  group_id      uuid PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  chaperone_id  uuid NOT NULL REFERENCES chaperones(id) ON DELETE CASCADE,
  assigned_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── Token-based scoring access (one token per group per tournament) ──────────
CREATE TABLE IF NOT EXISTS group_scoring_tokens (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tournament_id uuid        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  token         uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz
);

-- Enforce one token per group per tournament (upsert-safe)
CREATE UNIQUE INDEX IF NOT EXISTS group_scoring_tokens_group_tournament_idx
  ON group_scoring_tokens(group_id, tournament_id);
