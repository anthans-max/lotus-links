import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LiveLeaderboard from '@/components/leaderboard/LiveLeaderboard'

export const metadata: Metadata = {
  title: 'Leaderboard',
}

interface Props {
  params: Promise<{ tournamentId: string }>
}

export default async function LeaderboardPage({ params }: Props) {
  const { tournamentId } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, date, course, format, holes, status, leaderboard_public, league_id')
    .eq('id', tournamentId)
    .single()

  if (!tournament) {
    return <NotFoundView />
  }

  if (!tournament.leaderboard_public) {
    return <NotPublicView tournamentName={tournament.name} />
  }

  // Fetch league
  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', tournament.league_id)
    .single()

  // Fetch holes for par data
  const { data: holes } = await supabase
    .from('holes')
    .select('hole_number, par')
    .eq('tournament_id', tournamentId)
    .order('hole_number')

  // Fetch groups with players
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, chaperone_name, current_hole, status')
    .eq('tournament_id', tournamentId)
    .order('name')

  // Fetch all scores
  const { data: scores } = await supabase
    .from('scores')
    .select('group_id, hole_number, strokes')
    .eq('tournament_id', tournamentId)

  return (
    <LiveLeaderboard
      tournament={{
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
        course: tournament.course,
        format: tournament.format,
        holeCount: tournament.holes,
        status: tournament.status,
      }}
      leagueName={league?.name ?? ''}
      holes={(holes ?? []).map(h => ({ number: h.hole_number, par: h.par }))}
      groups={(groups ?? []).map(g => ({
        id: g.id,
        name: g.name,
        chaperoneName: g.chaperone_name,
        currentHole: g.current_hole ?? 1,
        status: g.status,
      }))}
      initialScores={(scores ?? []).map(s => ({
        groupId: s.group_id,
        holeNumber: s.hole_number,
        strokes: s.strokes,
      }))}
    />
  )
}

function NotFoundView() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛳</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
          Tournament Not Found
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          This leaderboard link doesn&apos;t match any tournament.
        </p>
      </div>
    </div>
  )
}

function NotPublicView({ tournamentName }: { tournamentName: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
          Leaderboard Not Yet Live
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          The leaderboard for <strong style={{ color: 'var(--gold)' }}>{tournamentName}</strong> hasn&apos;t been made public yet. Check back soon!
        </p>
        <div className="gold-divider" style={{ margin: '1.5rem auto' }} />
        <div style={{ fontFamily: 'var(--fd)', fontSize: '0.9rem', color: 'var(--gold)' }}>Lotus Links</div>
      </div>
    </div>
  )
}
