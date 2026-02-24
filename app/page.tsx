import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import PoweredByFooter from '@/components/ui/PoweredByFooter'

export const metadata: Metadata = {
  title: 'Lotus Links — Golf Tournament Management',
}

export default async function HomePage() {
  const supabase = await createClient()

  // Check if user is already logged in
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch public leaderboards (tournaments with leaderboard_public = true and active or upcoming)
  const { data: publicTournaments } = await supabase
    .from('tournaments')
    .select('id, name, course, date, status, league_id, leagues(name, primary_color)')
    .eq('leaderboard_public', true)
    .in('status', ['active', 'upcoming'])
    .order('date', { ascending: true })
    .limit(5)

  const liveTournaments = (publicTournaments ?? []) as any[]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      {/* Radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(200,168,75,0.05), transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Nav bar */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 'var(--nav)',
          background: 'rgba(10,18,10,0.95)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '0 1.25rem',
            height: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,var(--gold),#5a3e10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0,
              }}
            >
              ⛳
            </div>
            <div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>
                Lotus Links
              </div>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', fontFamily: 'var(--fm)' }}>
                Tournament Platform
              </div>
            </div>
          </div>

          {user ? (
            <Link href="/dashboard" className="btn btn-gold btn-sm">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="btn btn-gold btn-sm">
              Admin Login
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div
        className="section fade-up"
        style={{
          textAlign: 'center',
          paddingTop: '4rem',
          paddingBottom: '3rem',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--gold), #5a3e10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1.5rem',
            boxShadow: '0 8px 30px rgba(200,168,75,0.25)',
          }}
        >
          ⛳
        </div>

        <h1
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 'clamp(2rem, 6vw, 3rem)',
            fontWeight: 400,
            color: 'var(--text)',
            lineHeight: 1.15,
            marginBottom: '0.5rem',
          }}
        >
          Golf Tournament<br />
          <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Management</em>
        </h1>

        <div className="gold-divider" style={{ margin: '1rem auto' }} />

        <p
          style={{
            fontSize: '1rem',
            color: 'var(--text-muted)',
            lineHeight: 1.7,
            maxWidth: 480,
            margin: '0 auto 2.5rem',
          }}
        >
          Create tournaments, organize groups, track scores in real-time, and share live leaderboards with spectators.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Link href="/dashboard" className="btn btn-gold">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="/login" className="btn btn-gold">
              Admin Login
            </Link>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="g3">
          <FeatureCard
            icon="🏌️"
            title="Tournament Setup"
            description="Configure courses, holes, and formats. Import players from CSV or let parents register online."
          />
          <FeatureCard
            icon="📱"
            title="Mobile Score Entry"
            description="Chaperones enter scores per hole from their phone. No login required — just a group PIN."
          />
          <FeatureCard
            icon="🏆"
            title="Live Leaderboard"
            description="Spectators and parents follow along with a real-time public leaderboard as scores come in."
          />
        </div>
      </div>

      {/* Live Leaderboards */}
      {liveTournaments.length > 0 && (
        <div className="section" style={{ paddingTop: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span className="section-tag">Live Leaderboards</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {liveTournaments.map((t: any) => (
              <Link
                key={t.id}
                href={`/leaderboard/${t.id}`}
                className="card card-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  borderLeft: t.leagues?.primary_color ? `3px solid ${t.leagues.primary_color}` : undefined,
                }}
              >
                <div style={{ fontSize: '1.25rem' }}>🏆</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.15rem' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>{t.course}</span>
                    <span>{new Date(t.date).toLocaleDateString()}</span>
                    {t.leagues?.name && <span>{t.leagues.name}</span>}
                  </div>
                </div>
                <span className={`badge ${t.status === 'active' ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.58rem' }}>
                  {t.status === 'active' ? 'Live' : 'Upcoming'}
                </span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>&rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <PoweredByFooter />
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '1.75rem 1.25rem',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{description}</p>
    </div>
  )
}
