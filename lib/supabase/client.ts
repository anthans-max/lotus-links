import { createBrowserClient } from '@supabase/ssr'

// Infer the exact return type from a real call so generics aren't lost
const _make = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Singleton — prevents multiple instances competing for the Web Locks auth token
let _client: ReturnType<typeof _make> | null = null

export function createClient() {
  if (!_client) _client = _make()
  return _client!
}
