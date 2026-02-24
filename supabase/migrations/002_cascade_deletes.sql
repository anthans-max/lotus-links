-- Sprint 1: Ensure CASCADE delete on all tournament child tables
--
-- IMPORTANT: Before running this migration, verify the constraint names match
-- your Supabase schema. Check in the Supabase Dashboard under:
--   Database → Tables → (select table) → Foreign Keys
--
-- The constraint names below follow Supabase's default naming convention:
--   {table}_{column}_fkey
--
-- If your constraint names differ, update the DROP CONSTRAINT lines accordingly.

-- ─── holes → tournaments (CASCADE) ──────────────────────────────────────────
ALTER TABLE holes DROP CONSTRAINT IF EXISTS holes_tournament_id_fkey;
ALTER TABLE holes ADD CONSTRAINT holes_tournament_id_fkey
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- ─── players → tournaments (CASCADE) ────────────────────────────────────────
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_tournament_id_fkey;
ALTER TABLE players ADD CONSTRAINT players_tournament_id_fkey
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- ─── groups → tournaments (CASCADE) ─────────────────────────────────────────
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_tournament_id_fkey;
ALTER TABLE groups ADD CONSTRAINT groups_tournament_id_fkey
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- ─── scores → tournaments (CASCADE) ─────────────────────────────────────────
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_tournament_id_fkey;
ALTER TABLE scores ADD CONSTRAINT scores_tournament_id_fkey
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- ─── scores → groups (CASCADE) ──────────────────────────────────────────────
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_group_id_fkey;
ALTER TABLE scores ADD CONSTRAINT scores_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- ─── group_players → groups (CASCADE) ───────────────────────────────────────
ALTER TABLE group_players DROP CONSTRAINT IF EXISTS group_players_group_id_fkey;
ALTER TABLE group_players ADD CONSTRAINT group_players_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- ─── group_players → players (CASCADE) ──────────────────────────────────────
ALTER TABLE group_players DROP CONSTRAINT IF EXISTS group_players_player_id_fkey;
ALTER TABLE group_players ADD CONSTRAINT group_players_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- ─── tournaments → leagues (CASCADE) ────────────────────────────────────────
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_league_id_fkey;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_league_id_fkey
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;

-- ─── seasons → leagues (CASCADE) ────────────────────────────────────────────
ALTER TABLE seasons DROP CONSTRAINT IF EXISTS seasons_league_id_fkey;
ALTER TABLE seasons ADD CONSTRAINT seasons_league_id_fkey
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;
