import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'

export const metadata: Metadata = {
  title: 'Leagues',
}

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const superAdmin = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''
  const isSuperAdmin = user.email === superAdmin

  // Fetch leagues — filter by admin_email unless super admin
  let query = supabase
    .from('leagues')
    .select('*, tournaments(id)')
    .order('created_at', { ascending: false })

  if (!isSuperAdmin) {
    query = query.eq('admin_email', user.email!)
  }

  const { data: leagues } = await query

  const leagueList = (leagues ?? []) as any[]

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {leagueList.map((league: any) => {
            const tournamentCount = Array.isArray(league.tournaments) ? league.tournaments.length : 0
            const color = league.primary_color || 'var(--green)'
            return (
              <Link
                key={league.id}
                href={`/dashboard/leagues/${league.id}`}
                className="card card-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: 'pointer',
                  borderLeft: `3px solid ${color}`,
                }}
              >
                {/* Logo or color swatch */}
                {league.logo_url ? (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '4px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--surface2)',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={league.logo_url}
                      alt={`${league.name} logo`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                    }}
                  >
                    ⛳
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '0.15rem' }}>
                    {league.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>{tournamentCount} tournament{tournamentCount !== 1 ? 's' : ''}</span>
                    <span>Created {new Date(league.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <span style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}>&rarr;</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
