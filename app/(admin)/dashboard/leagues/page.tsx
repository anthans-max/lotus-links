import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import LeagueList from '@/components/admin/LeagueList'
import type { LeagueWithCount } from '@/components/admin/LeagueList'

export const metadata: Metadata = {
  title: 'Leagues',
}

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const superAdmin = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''
  const isSuperAdmin = user.email === superAdmin

  // Determine which leagues this user can access
  let leagueIds: string[] | null = null
  let ownerLeagueIds: Set<string> = new Set()

  if (!isSuperAdmin) {
    const { data: myAdminRows } = await supabase
      .from('league_admins')
      .select('league_id, role')
      .eq('email', user.email!)
    leagueIds = (myAdminRows ?? []).map((r: any) => r.league_id)
    ownerLeagueIds = new Set(
      (myAdminRows ?? []).filter((r: any) => r.role === 'owner').map((r: any) => r.league_id)
    )
  }

  let query = supabase
    .from('leagues')
    .select('*, tournaments(id)')
    .order('created_at', { ascending: false })

  if (leagueIds !== null) {
    if (leagueIds.length === 0) {
      query = query.in('id', ['00000000-0000-0000-0000-000000000000']) // no-match sentinel
    } else {
      query = query.in('id', leagueIds)
    }
  }

  const { data: leagues } = await query

  // Owners and new users (no memberships yet) can create leagues; invited admins cannot
  const canCreateLeague = isSuperAdmin || ownerLeagueIds.size > 0 || (leagueIds?.length ?? 0) === 0

  const leagueList: LeagueWithCount[] = (leagues ?? []).map((l: any) => ({
    id: l.id,
    name: l.name,
    admin_email: l.admin_email,
    logo_url: l.logo_url,
    primary_color: l.primary_color,
    league_type: l.league_type ?? 'standard',
    created_at: l.created_at,
    updated_at: l.updated_at,
    tournamentCount: Array.isArray(l.tournaments) ? l.tournaments.length : 0,
    isOwner: isSuperAdmin || ownerLeagueIds.has(l.id),
  }))

  return (
    <div className="section fade-up">
      <PageHeader
        title="Your Leagues"
        action={
          canCreateLeague ? (
            <Link href="/dashboard/leagues/new" className="btn btn-gold btn-sm">
              + Create League
            </Link>
          ) : undefined
        }
      />

      {leagueList.length === 0 ? (
        <EmptyState
          icon="⛳"
          title="No Leagues Yet"
          description={canCreateLeague ? "Create your first league to start organizing tournaments." : "You haven't been invited to any leagues yet."}
          action={
            canCreateLeague ? (
              <Link href="/dashboard/leagues/new" className="btn btn-gold">
                Create Your First League
              </Link>
            ) : undefined
          }
        />
      ) : (
        <LeagueList leagues={leagueList} currentUserEmail={user.email!} />
      )}
    </div>
  )
}
