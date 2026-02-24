import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Badge from '@/components/ui/Badge'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch leagues with tournament counts
  const { data: leagues } = await supabase
    .from('leagues')
    .select('*, tournaments(id, name, date, status, course, format)')
    .order('created_at', { ascending: false })

  const leagueList = (leagues ?? []) as any[]
  const totalLeagues = leagueList.length
  const allTournaments = leagueList.flatMap((l: any) => l.tournaments || [])
  const totalTournaments = allTournaments.length
  const upcomingTournaments = allTournaments.filter((t: any) => t.status === 'upcoming')

  return (
    <div className="section fade-up">
      {/* Hero */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg,var(--forest) 0%,var(--surface) 100%)',
          border: '1px solid var(--gold-border)',
          borderRadius: 2,
          padding: '2.5rem',
          marginBottom: '1.5rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '40%',
            height: '100%',
            background: 'radial-gradient(ellipse at right,rgba(200,168,75,0.08),transparent)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            right: -20,
            fontSize: '8rem',
            opacity: 0.04,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          ⛳
        </div>
        <span className="section-tag">Dashboard</span>
        <div className="gold-divider" />
        <h1
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 'clamp(1.75rem,4vw,2.5rem)',
            fontWeight: 400,
            color: 'var(--text)',
            marginBottom: '0.5rem',
            lineHeight: 1.1,
          }}
        >
          Welcome to <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Lotus Links</em>
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Manage your leagues, tournaments, and live scoring all in one place.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/leagues" className="btn btn-gold">
            Manage Leagues &rarr;
          </Link>
          {totalLeagues === 0 && (
            <Link href="/dashboard/leagues/new" className="btn btn-outline">
              Create First League
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      {(() => {
        // Compute links for each KPI card
        const leaguesHref = '/dashboard/leagues'
        const tournamentsHref = totalLeagues === 1
          ? `/dashboard/leagues/${leagueList[0].id}`
          : '/dashboard/leagues'
        const upcomingHref = (() => {
          if (upcomingTournaments.length === 1) {
            const t = upcomingTournaments[0]
            const league = leagueList.find((l: any) =>
              (l.tournaments || []).some((lt: any) => lt.id === t.id)
            )
            if (league) return `/dashboard/leagues/${league.id}/tournaments/${t.id}`
          }
          return '/dashboard/leagues'
        })()

        const kpis = [
          { label: 'Leagues', value: String(totalLeagues), icon: '🏆', href: leaguesHref },
          { label: 'Tournaments', value: String(totalTournaments), icon: '⛳', href: tournamentsHref },
          { label: 'Upcoming', value: String(upcomingTournaments.length), icon: '📅', href: upcomingHref },
        ]

        return (
          <div className="g3" style={{ marginBottom: '1.5rem' }}>
            {kpis.map((s, i) => (
              <Link key={i} href={s.href} className="card card-hover" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                  <div>
                    <div className="label">{s.label}</div>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', fontWeight: 400, color: 'var(--text)', lineHeight: 1 }}>
                      {s.value}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      })()}

      {/* Upcoming / Recent tournaments */}
      {allTournaments.length > 0 && (
        <div>
          <div style={{ marginBottom: '0.75rem' }}>
            <span className="section-tag">Recent Tournaments</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {allTournaments
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((t: any) => {
                // Find the league for this tournament
                const league = leagueList.find((l: any) =>
                  (l.tournaments || []).some((lt: any) => lt.id === t.id)
                )
                return (
                  <Link
                    key={t.id}
                    href={league ? `/dashboard/leagues/${league.id}/tournaments/${t.id}` : '#'}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem 1.25rem',
                      transition: 'border-color 0.2s',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.15rem' }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span>{new Date(t.date).toLocaleDateString()}</span>
                        <span>{t.course}</span>
                        {league && <span>{league.name}</span>}
                      </div>
                    </div>
                    <Badge status={t.status}>{t.status}</Badge>
                    <span style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}>&rarr;</span>
                  </Link>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
