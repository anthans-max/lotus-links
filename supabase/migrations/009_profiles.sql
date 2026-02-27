-- 009: User profiles — synced from Google OAuth on first login
-- Enables Fescue league admin (Zack) to log in with Google and be identified
-- by their email, which is matched against leagues.admin_email.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can read own profile' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can read own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- Users can insert / update their own profile (upserted by the OAuth callback)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can upsert own profile' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can upsert own profile" ON profiles
      FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;
