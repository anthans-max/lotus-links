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

  const { data: league } = await supabase
    .from('leagues')
    .select('admin_email')
    .eq('id', leagueId)
    .single()

  if (!league) return { user, hasAccess: false }

  return { user, hasAccess: league.admin_email === user.email }
}
