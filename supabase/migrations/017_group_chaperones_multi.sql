-- Migration 017: allow multiple chaperones per group
-- Previously group_chaperones had group_id as the sole primary key (one per group).
-- Change to a composite primary key (group_id, chaperone_id) so many chaperones
-- can be assigned to the same group.

ALTER TABLE group_chaperones DROP CONSTRAINT IF EXISTS group_chaperones_pkey;
ALTER TABLE group_chaperones ADD PRIMARY KEY (group_id, chaperone_id);
