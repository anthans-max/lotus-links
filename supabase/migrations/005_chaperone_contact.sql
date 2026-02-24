-- Add chaperone contact info to groups for link sharing
ALTER TABLE groups ADD COLUMN IF NOT EXISTS chaperone_email text;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS chaperone_phone text;
