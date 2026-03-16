-- Migration 018: allow anon SELECT on chaperones and group_chaperones
-- Required so the public pairings page (/pairings/[token]) can display
-- chaperone names without a Supabase auth session.
--
-- Only chaperone names are shown publicly; email/phone are never rendered
-- on the public page, but the whole row is readable via anon key.
-- If stricter PII control is needed in future, create a chaperones_safe
-- view (like players_safe) that excludes contact columns.

CREATE POLICY "chaperones: anon read"
  ON chaperones FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "group_chaperones: anon read"
  ON group_chaperones FOR SELECT
  TO anon
  USING (true);
