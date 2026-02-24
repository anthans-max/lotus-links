-- Sprint 5C: Admin infrastructure
-- Leagues: add updated_at for edit tracking
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
