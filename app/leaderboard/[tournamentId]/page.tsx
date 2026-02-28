import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import LiveLeaderboard from '@/components/leaderboard/LiveLeaderboard'
import PoweredByFooter from '@/components/ui/PoweredByFooter'
import { parseStablefordConfig } from '@/lib/scoring/stableford'
import ChatAssistant from '@/components/chat/ChatAssistant'

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
    .select('id, name, date, course, format, holes, status, leaderboard_public, league_id, slope_rating, course_rating, stableford_points_config')
    .eq('id', tournamentId)
    .single()

  if (!tournament) {
    return <NotFoundView />
  }

  if (!tournament.leaderboard_public) {
    return (
      <>
        <ComingSoonView tournamentName={tournament.name} tournamentDate={tournament.date} />
        <ChatAssistant tournamentId={tournamentId} />
      </>
    )
  }

  const isIndividual = tournament.format === 'Stableford' || tournament.format === 'Stroke Play'

  // Fetch league
  const { data: league } = await supabase
    .from('leagues')
    .select('name, primary_color')
    .eq('id', tournament.league_id)
    .single()

  // Fetch holes for par data + stroke indexes
  const { data: holes } = await supabase
    .from('holes')
    .select('hole_number, par, handicap')
    .eq('tournament_id', tournamentId)
    .order('hole_number')

  if (isIndividual) {
    // Individual format: fetch players and per-player scores
    const [{ data: players }, { data: scores }] = await Promise.all([
      supabase
        .from('players')
        .select('id, name, handicap, handicap_index')
        .eq('tournament_id', tournamentId)
        .order('name'),
      supabase
        .from('scores')
        .select('player_id, hole_number, strokes')
        .eq('tournament_id', tournamentId)
        .not('player_id', 'is', null),
    ])

    const stablefordConfig = parseStablefordConfig(tournament.stableford_points_config)

    return (
      <>
        <LiveLeaderboard
          tournament={{
            id: tournament.id,
            name: tournament.name,
            date: tournament.date,
            course: tournament.course,
            format: tournament.format,
            holeCount: tournament.holes,
            status: tournament.status,
            slopeRating: tournament.slope_rating ?? 113,
            courseRating: tournament.course_rating ?? null,
            stablefordConfig,
          }}
          leagueName={league?.name ?? ''}
          leagueColor={league?.primary_color ?? undefined}
          holes={(holes ?? []).map(h => ({ number: h.hole_number, par: h.par, strokeIndex: h.handicap }))}
          groups={[]}
          initialScores={[]}
          players={(players ?? []).map(p => ({
            id: p.id,
            name: p.name,
            handicap: p.handicap ?? 0,
            handicapIndex: (p as any).handicap_index ?? null,
          }))}
          initialPlayerScores={(scores ?? [])
            .filter(s => s.player_id != null)
            .map(s => ({
              playerId: s.player_id!,
              holeNumber: s.hole_number,
              strokes: s.strokes,
            }))}
        />
        <ChatAssistant tournamentId={tournamentId} />
      </>
    )
  }

  // Group / scramble format
  const [{ data: groups }, { data: scores }] = await Promise.all([
    supabase
      .from('groups')
      .select('id, name, chaperone_name, current_hole, status')
      .eq('tournament_id', tournamentId)
      .order('name'),
    supabase
      .from('scores')
      .select('group_id, hole_number, strokes')
      .eq('tournament_id', tournamentId),
  ])

  return (
    <>
      <LiveLeaderboard
        tournament={{
          id: tournament.id,
          name: tournament.name,
          date: tournament.date,
          course: tournament.course,
          format: tournament.format,
          holeCount: tournament.holes,
          status: tournament.status,
          slopeRating: 113,
          courseRating: null,
          stablefordConfig: parseStablefordConfig(null),
        }}
        leagueName={league?.name ?? ''}
        leagueColor={league?.primary_color ?? undefined}
        holes={(holes ?? []).map(h => ({ number: h.hole_number, par: h.par, strokeIndex: h.handicap }))}
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
        players={[]}
        initialPlayerScores={[]}
      />
      <ChatAssistant tournamentId={tournamentId} />
    </>
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

function ComingSoonView({ tournamentName, tournamentDate }: { tournamentName: string; tournamentDate: string }) {
  const formattedDate = (() => {
    try {
      return new Date(tournamentDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return tournamentDate
    }
  })()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), #5a3e10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>⛳</div>
          <span style={{ fontFamily: 'var(--fd)', fontSize: '0.9rem', color: 'var(--gold)' }}>Lotus Links</span>
        </div>

        <div style={{ background: 'linear-gradient(135deg, var(--forest), var(--surface2))', border: '1px solid var(--gold-border)', borderRadius: 12, padding: '2.5rem 2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '8rem', opacity: 0.04, pointerEvents: 'none' }}>🏆</div>
          <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🏌️</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
            Leaderboard Coming Soon
          </div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', color: 'var(--gold)', marginBottom: '1rem' }}>
            {tournamentName}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            The leaderboard will be live on tournament day. Check back on:
          </p>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1.25rem', display: 'inline-block' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', color: 'var(--gold)' }}>
              {formattedDate}
            </div>
          </div>
        </div>

        <PoweredByFooter />
      </div>
    </div>
  )
}
