import { createClient } from '@/lib/supabase/server'

/**
 * Check if the current user has access to a given league.
 * Returns { user, hasAccess } — caller should redirect if !hasAccess.
 */
export async function checkLeagueAccess(leagueId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { user: null, hasAccess: false }

  const superAdmin = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''
  if (user.email === superAdmin) {
    return { user, hasAccess: true }
  }

  const { data } = await supabase
    .from('league_admins')
    .select('role')
    .eq('league_id', leagueId)
    .eq('email', user.email!)
    .single()

  return { user, hasAccess: !!data }
}

/**
 * Returns the current user's role for a league: 'owner' | 'admin' | null
 * null means no access. Super admin always gets 'owner'.
 */
export async function getLeagueRole(leagueId: string): Promise<'owner' | 'admin' | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const superAdmin = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''
  if (user.email === superAdmin) return 'owner'

  const { data } = await supabase
    .from('league_admins')
    .select('role')
    .eq('league_id', leagueId)
    .eq('email', user.email!)
    .single()

  return (data?.role as 'owner' | 'admin') ?? null
}
