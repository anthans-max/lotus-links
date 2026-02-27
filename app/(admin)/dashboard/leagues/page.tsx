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

  let query = supabase
    .from('leagues')
    .select('*, tournaments(id)')
    .order('created_at', { ascending: false })

  if (!isSuperAdmin) {
    query = query.eq('admin_email', user.email!)
  }

  const { data: leagues } = await query

  const leagueList: LeagueWithCount[] = (leagues ?? []).map((l: any) => ({
    id: l.id,
    name: l.name,
    admin_email: l.admin_email,
    logo_url: l.logo_url,
    primary_color: l.primary_color,
    created_at: l.created_at,
    updated_at: l.updated_at,
    tournamentCount: Array.isArray(l.tournaments) ? l.tournaments.length : 0,
  }))

  return (
    <div className="section fade-up">
      <PageHeader
        title="Your Leagues"
        action={
          <Link href="/dashboard/leagues/new" className="btn btn-gold btn-sm">
            + Create League
          </Link>
        }
      />

      {leagueList.length === 0 ? (
        <EmptyState
          icon="⛳"
          title="No Leagues Yet"
          description="Create your first league to start organizing tournaments."
          action={
            <Link href="/dashboard/leagues/new" className="btn btn-gold">
              Create Your First League
            </Link>
          }
        />
      ) : (
        <LeagueList leagues={leagueList} />
      )}
    </div>
  )
}
