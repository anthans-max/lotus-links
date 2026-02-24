import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'

export const metadata: Metadata = {
  title: 'Leagues',
}

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch leagues with tournament count
  const { data: leagues } = await supabase
    .from('leagues')
    .select('*, tournaments(id)')
    .order('created_at', { ascending: false })

  const leagueList = (leagues ?? []) as (typeof leagues extends (infer T)[] | null ? T : never)[]

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
            return (
              <Link
                key={league.id}
                href={`/dashboard/leagues/${league.id}`}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e: any) => e.currentTarget.style.borderColor = 'var(--gold-border)'}
                onMouseLeave={(e: any) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Color swatch */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: league.primary_color || 'var(--green)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                  }}
                >
                  ⛳
                </div>

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
