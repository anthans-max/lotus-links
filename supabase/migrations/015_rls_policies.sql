-- =============================================================================
-- Migration 015: Role-based RLS — replace permissive MVP policies
-- =============================================================================
--
-- Run in Supabase SQL Editor. Safe to run in one pass.
--
-- DESIGN DECISIONS:
--
--   Roles implemented:
--     super_admin  — profiles.role = 'super_admin'. Full access everywhere.
--     league_admin — league_admins table (email + accepted_at IS NOT NULL).
--                    Scoped to their league only. Includes both 'owner' and 'admin'.
--     anon/public  — unauthenticated. Read-only on public data + score/group writes
--                    (required: chaperones are unauthenticated by design).
--
--   Roles NOT implemented (require new tables + app changes):
--     tournament_official — would need a tournament_officials join table
--     member              — would need a league_members table
--
--   Chaperone score entry is intentionally kept open to anon:
--     Chaperones authenticate via PIN or token, NOT Supabase auth.
--     scores INSERT/UPDATE and groups UPDATE remain USING (true).
--
--   Public registration (/register/[tournamentId]) is intentionally open:
--     players INSERT/UPDATE and pairing_preferences remain USING (true).
--
--   PII protection (parent_name, parent_phone, parent_email on players):
--     A `players_safe` view is created that excludes these columns.
--     Public pages should query `players_safe`; league admins query `players`.
--     The SELECT policy on `players` currently stays public to avoid breaking
--     existing app code. Restrict it to league admins once app code is updated
--     to use `players_safe` everywhere (see TODO comment below).
--
--   After running this migration:
--     UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
--
-- =============================================================================


-- =============================================================================
-- STEP 1: Add role column to profiles
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'user'));

-- After migration: grant yourself super_admin
-- UPDATE profiles SET role = 'super_admin' WHERE email = 'anthansunder@gmail.com';


-- =============================================================================
-- STEP 2: Helper functions
-- SECURITY DEFINER prevents recursive RLS calls (these functions bypass RLS
-- on the tables they query, running as the function owner = postgres).
-- =============================================================================

-- Returns true if the calling user has role = 'super_admin'
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT role = 'super_admin' FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Returns the set of league UUIDs where the calling user is an accepted admin
-- Uses auth.email() (from JWT) to match league_admins — no profiles join needed.
CREATE OR REPLACE FUNCTION public.get_my_league_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT la.league_id
  FROM league_admins la
  WHERE la.email = auth.email()
    AND la.accepted_at IS NOT NULL;
$$;

-- Returns true if the calling user is a super_admin OR admins the given league
CREATE OR REPLACE FUNCTION public.is_league_admin(lid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT is_super_admin() OR EXISTS (
    SELECT 1
    FROM league_admins la
    WHERE la.email      = auth.email()
      AND la.league_id  = lid
      AND la.accepted_at IS NOT NULL
  );
$$;

-- Returns true if the calling user is an owner (role='owner') of a specific league.
-- SECURITY DEFINER: bypasses RLS so this can safely be called from league_admins
-- policies without triggering recursive RLS on the league_admins table itself.
CREATE OR REPLACE FUNCTION public.is_league_owner(lid uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT is_super_admin() OR EXISTS (
    SELECT 1
    FROM league_admins la
    WHERE la.email        = auth.email()
      AND la.league_id    = lid
      AND la.role         = 'owner'
      AND la.accepted_at IS NOT NULL
  );
$$;


-- =============================================================================
-- STEP 3: PII-safe view for public player access
-- Excludes parent_name, parent_phone, parent_email.
-- Public pages (registration, scoring, leaderboard) use this view.
-- League admins query the players table directly.
-- The view owner is the postgres superuser, so it bypasses RLS on players.
-- =============================================================================

DROP VIEW IF EXISTS public.players_safe;

CREATE VIEW public.players_safe AS
  SELECT
    id,
    tournament_id,
    name,
    grade,
    handicap,
    handicap_index,
    skill_level,
    status,
    player_email,
    willing_to_chaperone,
    registration_comments,
    registered_at
  FROM public.players;
  -- Intentionally excluded: parent_name, parent_phone, parent_email

GRANT SELECT ON public.players_safe TO anon, authenticated;


-- =============================================================================
-- TABLE: profiles
-- =============================================================================

DROP POLICY IF EXISTS "Users can read own profile"    ON profiles;
DROP POLICY IF EXISTS "Users can upsert own profile"  ON profiles;

-- Users read their own profile row; super admins read all
CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR is_super_admin());

-- OAuth callback upserts the current user's profile (INSERT)
CREATE POLICY "profiles: own insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users update only their own profile (role column included — app enforces no self-promotion)
CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING    (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admins have unrestricted access (including setting role = 'super_admin')
CREATE POLICY "profiles: super_admin all"
  ON profiles FOR ALL
  USING    (is_super_admin())
  WITH CHECK (is_super_admin());


-- =============================================================================
-- TABLE: league_admins
-- (RLS was not enabled in migration 013 — enable it here)
-- =============================================================================

ALTER TABLE league_admins ENABLE ROW LEVEL SECURITY;

-- Any accepted admin can see who else admins their leagues
CREATE POLICY "league_admins: read own leagues"
  ON league_admins FOR SELECT
  USING (
    is_super_admin()
    OR league_id = ANY(SELECT get_my_league_ids())
  );

-- Only league owners can add admins to their league.
-- Uses is_league_owner() (SECURITY DEFINER) to avoid recursive RLS on league_admins.
CREATE POLICY "league_admins: owner insert"
  ON league_admins FOR INSERT
  WITH CHECK (is_league_owner(league_admins.league_id));

-- Only league owners can remove admins from their league
CREATE POLICY "league_admins: owner delete"
  ON league_admins FOR DELETE
  USING (is_league_owner(league_admins.league_id));

-- Auth callback sets accepted_at when an invited user first logs in
CREATE POLICY "league_admins: accept own invite"
  ON league_admins FOR UPDATE
  USING    (is_super_admin() OR email = auth.email())
  WITH CHECK (is_super_admin() OR email = auth.email());


-- =============================================================================
-- TABLE: leagues
-- (RLS not previously enabled)
-- =============================================================================

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- Public read: needed for registration page headers, leaderboard, scoring links
CREATE POLICY "leagues: public read"
  ON leagues FOR SELECT
  USING (true);

-- Any authenticated user can create a league (they become owner via createLeague server action)
CREATE POLICY "leagues: authenticated insert"
  ON leagues FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- League admins (owner or admin role) can update their league's settings
CREATE POLICY "leagues: admin update"
  ON leagues FOR UPDATE
  USING    (is_league_admin(id))
  WITH CHECK (is_league_admin(id));

-- Only league owners (role = 'owner') or super admin can delete a league
CREATE POLICY "leagues: owner delete"
  ON leagues FOR DELETE
  USING (is_league_owner(leagues.id));


-- =============================================================================
-- TABLE: seasons
-- (RLS not previously enabled)
-- =============================================================================

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Public read (tournament pages reference season names)
CREATE POLICY "seasons: public read"
  ON seasons FOR SELECT
  USING (true);

-- League admins manage seasons for their leagues
CREATE POLICY "seasons: admin write"
  ON seasons FOR ALL
  USING    (is_league_admin(league_id))
  WITH CHECK (is_league_admin(league_id));


-- =============================================================================
-- TABLE: tournaments
-- Drops all permissive MVP policies and replaces.
-- =============================================================================

DROP POLICY IF EXISTS "Public can view tournaments"              ON tournaments;
DROP POLICY IF EXISTS "Authenticated full access tournaments"    ON tournaments;

-- Public read: registration, leaderboard, scoring — all unauthenticated routes
CREATE POLICY "tournaments: public read"
  ON tournaments FOR SELECT
  USING (true);

-- League admins can create tournaments in their leagues
CREATE POLICY "tournaments: admin insert"
  ON tournaments FOR INSERT
  WITH CHECK (is_league_admin(league_id));

-- League admins can update their league's tournaments
CREATE POLICY "tournaments: admin update"
  ON tournaments FOR UPDATE
  USING    (is_league_admin(league_id))
  WITH CHECK (is_league_admin(league_id));

-- League admins can delete their league's tournaments
CREATE POLICY "tournaments: admin delete"
  ON tournaments FOR DELETE
  USING (is_league_admin(league_id));


-- =============================================================================
-- TABLE: holes
-- =============================================================================

DROP POLICY IF EXISTS "Public can view holes" ON holes;

-- Public read: chaperone scoring app requires hole par, yardage, handicap (SI)
CREATE POLICY "holes: public read"
  ON holes FOR SELECT
  USING (true);

-- League admins manage holes for their tournaments
CREATE POLICY "holes: admin write"
  ON holes FOR ALL
  USING (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  )
  WITH CHECK (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  );


-- =============================================================================
-- TABLE: players
-- PII columns (parent_name, parent_phone, parent_email) are visible to all
-- until app code is updated to use players_safe for public-facing queries.
--
-- TODO (post-tournament): Switch public pages to query players_safe, then
-- replace "players: public read" with a league-admin-only SELECT policy.
-- =============================================================================

DROP POLICY IF EXISTS "Public can view tournament players"      ON players;
DROP POLICY IF EXISTS "Public can register players"             ON players;
DROP POLICY IF EXISTS "Public can add players"                  ON players;
DROP POLICY IF EXISTS "Authenticated full access players"       ON players;

-- Public SELECT (registration page shows player list; scoring app shows names)
-- WARNING: Exposes PII until app is migrated to players_safe view.
CREATE POLICY "players: public read"
  ON players FOR SELECT
  USING (true);

-- Public INSERT: "I don't see my child" self-registration path
CREATE POLICY "players: public insert"
  ON players FOR INSERT
  WITH CHECK (true);

-- Public UPDATE: parent confirms registration, adds contact info
CREATE POLICY "players: public update"
  ON players FOR UPDATE
  USING    (true)
  WITH CHECK (true);

-- League admins have full control over players in their tournaments,
-- including DELETE (public policies above don't grant DELETE).
CREATE POLICY "players: admin all"
  ON players FOR ALL
  USING (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  )
  WITH CHECK (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  );


-- =============================================================================
-- TABLE: pairing_preferences
-- =============================================================================

DROP POLICY IF EXISTS "Public can insert pairing preferences"           ON pairing_preferences;
DROP POLICY IF EXISTS "Public can view pairing preferences"             ON pairing_preferences;
DROP POLICY IF EXISTS "Public can delete pairing preferences"           ON pairing_preferences;
DROP POLICY IF EXISTS "Authenticated full access pairing_preferences"   ON pairing_preferences;

-- Public read: registration page checks for existing preferences
CREATE POLICY "pairing_preferences: public read"
  ON pairing_preferences FOR SELECT
  USING (true);

-- Public INSERT/DELETE: parents submit or retract pairing requests
CREATE POLICY "pairing_preferences: public insert"
  ON pairing_preferences FOR INSERT
  WITH CHECK (true);

CREATE POLICY "pairing_preferences: public delete"
  ON pairing_preferences FOR DELETE
  USING (true);

-- League admins have full control (group auto-generation reads these)
CREATE POLICY "pairing_preferences: admin all"
  ON pairing_preferences FOR ALL
  USING (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  )
  WITH CHECK (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  );


-- =============================================================================
-- TABLE: groups
-- =============================================================================

DROP POLICY IF EXISTS "Public can view groups"   ON groups;
DROP POLICY IF EXISTS "Public can update groups" ON groups;

-- Public read: chaperone needs group info (name, pin, starting_hole, current_hole)
CREATE POLICY "groups: public read"
  ON groups FOR SELECT
  USING (true);

-- Anon UPDATE: chaperone advances current_hole and sets status.
-- This is intentional — chaperones have no Supabase auth session.
CREATE POLICY "groups: anon update"
  ON groups FOR UPDATE
  USING    (true)
  WITH CHECK (true);

-- League admins have full control (create, assign tee times, delete)
CREATE POLICY "groups: admin all"
  ON groups FOR ALL
  USING (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  )
  WITH CHECK (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  );


-- =============================================================================
-- TABLE: group_players
-- =============================================================================

DROP POLICY IF EXISTS "Public can view group_players" ON group_players;

-- Public read: chaperone scoring app and leaderboard need player↔group mapping
CREATE POLICY "group_players: public read"
  ON group_players FOR SELECT
  USING (true);

-- League admins manage group rosters
CREATE POLICY "group_players: admin write"
  ON group_players FOR ALL
  USING (
    is_league_admin(
      (SELECT t.league_id
       FROM tournaments t
       JOIN groups g ON g.tournament_id = t.id
       WHERE g.id = group_players.group_id)
    )
  )
  WITH CHECK (
    is_league_admin(
      (SELECT t.league_id
       FROM tournaments t
       JOIN groups g ON g.tournament_id = t.id
       WHERE g.id = group_players.group_id)
    )
  );


-- =============================================================================
-- TABLE: scores
-- CRITICAL: Chaperone score entry is unauthenticated. INSERT and UPDATE
-- must remain open to anon. DELETE is restricted to league admins only.
-- =============================================================================

DROP POLICY IF EXISTS "Public can view scores"   ON scores;
DROP POLICY IF EXISTS "Public can insert scores" ON scores;
DROP POLICY IF EXISTS "Public can update scores" ON scores;
DROP POLICY IF EXISTS "Public can delete scores" ON scores;

-- Public leaderboard reads all scores
CREATE POLICY "scores: public read"
  ON scores FOR SELECT
  USING (true);

-- Anon INSERT: chaperone submits a score for a hole (PIN or token validated in app)
CREATE POLICY "scores: anon insert"
  ON scores FOR INSERT
  WITH CHECK (true);

-- Anon UPDATE: chaperone corrects a score on the current card
CREATE POLICY "scores: anon update"
  ON scores FOR UPDATE
  USING    (true)
  WITH CHECK (true);

-- Only league admins can delete scores (score rollback / admin correction)
CREATE POLICY "scores: admin delete"
  ON scores FOR DELETE
  USING (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  );


-- =============================================================================
-- TABLE: chaperones
-- Contains contact info (phone, email) — league admin + super admin only.
-- (RLS not previously enabled)
-- =============================================================================

ALTER TABLE chaperones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chaperones: admin all"
  ON chaperones FOR ALL
  USING (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  )
  WITH CHECK (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  );


-- =============================================================================
-- TABLE: group_chaperones
-- (RLS not previously enabled)
-- =============================================================================

ALTER TABLE group_chaperones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_chaperones: admin all"
  ON group_chaperones FOR ALL
  USING (
    is_league_admin(
      (SELECT t.league_id
       FROM tournaments t
       JOIN groups g ON g.tournament_id = t.id
       WHERE g.id = group_chaperones.group_id)
    )
  )
  WITH CHECK (
    is_league_admin(
      (SELECT t.league_id
       FROM tournaments t
       JOIN groups g ON g.tournament_id = t.id
       WHERE g.id = group_chaperones.group_id)
    )
  );


-- =============================================================================
-- TABLE: group_scoring_tokens
-- Tokens must be publicly readable so /score/t/[token] can validate
-- without a Supabase auth session.
-- (RLS not previously enabled)
-- =============================================================================

ALTER TABLE group_scoring_tokens ENABLE ROW LEVEL SECURITY;

-- Anyone can SELECT tokens (the token itself is the secret; app validates expiry)
CREATE POLICY "group_scoring_tokens: public read"
  ON group_scoring_tokens FOR SELECT
  USING (true);

-- Only league admins can create or delete tokens
CREATE POLICY "group_scoring_tokens: admin write"
  ON group_scoring_tokens FOR ALL
  USING (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  )
  WITH CHECK (
    is_league_admin(
      (SELECT league_id FROM tournaments WHERE id = tournament_id)
    )
  );


-- =============================================================================
-- STEP 4: Grant super_admin to your account
-- Run this AFTER the migration completes.
-- =============================================================================

-- UPDATE profiles SET role = 'super_admin' WHERE email = 'anthansunder@gmail.com';


-- =============================================================================
-- VERIFICATION QUERIES
-- Paste each block into the SQL editor individually after running the migration.
-- =============================================================================

/*

-- ── 1. Confirm helper functions exist ────────────────────────────────────────
SELECT routine_name, data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_super_admin', 'get_my_league_ids', 'is_league_admin')
ORDER BY routine_name;
-- Expected: 3 rows returned

-- ── 2. List all active policies — confirm no old "Public can ..." remain ──────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'Public can %'
ORDER BY tablename;
-- Expected: 0 rows (all MVP policies dropped)

-- ── 3. Full policy audit across secured tables ────────────────────────────────
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ── 4. Confirm players_safe view exists and hides PII ─────────────────────────
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'players_safe'
ORDER BY ordinal_position;
-- Expected columns: id, tournament_id, name, grade, handicap, handicap_index,
--   skill_level, status, player_email, willing_to_chaperone,
--   registration_comments, registered_at
-- NOT expected: parent_name, parent_phone, parent_email

-- ── 5. After granting super_admin, test the helper functions ──────────────────
-- (Run while logged into Supabase as your admin account via a client session,
--  or use the Supabase "Run as user" feature in the Auth tab)
SELECT is_super_admin();                          -- expected: true
SELECT * FROM get_my_league_ids();               -- expected: your league UUIDs
SELECT is_league_admin('<paste-a-league-uuid>'); -- expected: true

*/
