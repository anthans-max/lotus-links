import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import StablefordScoringApp from '@/components/scoring/StablefordScoringApp'
import { parseStablefordConfig } from '@/lib/scoring/stableford'
import PoweredByFooter from '@/components/ui/PoweredByFooter'

export const metadata: Metadata = {
  title: 'Score Entry',
}

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ group?: string }>
}

export default async function TokenScoringPage({ params, searchParams }: Props) {
  const { token } = await params
  const { group: groupId } = await searchParams
  const supabase = await createClient()

  // Validate token — find the tournament it belongs to
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, date, course, format, holes, status, league_id, public_token, slope_rating, course_rating, stableford_points_config')
    .eq('public_token', token)
    .single()

  if (!tournament) {
    return <InvalidTokenView />
  }

  const [{ data: league }, { data: holes }, { data: allPlayers }, { data: initialScores }] =
    await Promise.all([
      supabase.from('leagues').select('name, primary_color').eq('id', tournament.league_id).single(),
      supabase
        .from('holes')
        .select('hole_number, par, yardage, handicap')
        .eq('tournament_id', tournament.id)
        .order('hole_number'),
      supabase
        .from('players')
        .select('id, name, handicap, handicap_index')
        .eq('tournament_id', tournament.id)
        .order('name'),
      supabase
        .from('scores')
        .select('player_id, hole_number, strokes')
        .eq('tournament_id', tournament.id)
        .not('player_id', 'is', null),
    ])

  // If a group ID is provided, validate it belongs to this tournament and filter players
  let players = allPlayers ?? []
  if (groupId) {
    const { data: groupData } = await supabase
      .from('groups')
      .select('group_players(player_id)')
      .eq('id', groupId)
      .eq('tournament_id', tournament.id)  // server-side validation
      .single()

    if (groupData) {
      const groupPlayerIds = new Set(
        (groupData.group_players as { player_id: string }[]).map(gp => gp.player_id)
      )
      players = players.filter(p => groupPlayerIds.has(p.id))
    }
    // If groupData is null (group not found / wrong tournament), fall back to all players
  }

  const stablefordConfig = parseStablefordConfig(tournament.stableford_points_config)

  return (
    <StablefordScoringApp
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
      holes={(holes ?? []).map(h => ({
        number: h.hole_number,
        par: h.par,
        yardage: h.yardage,
        handicap: h.handicap,
      }))}
      players={players.map(p => ({
        id: p.id,
        name: p.name,
        handicap: p.handicap ?? 0,
        handicapIndex: (p as any).handicap_index ?? null,
      }))}
      initialScores={(initialScores ?? [])
        .filter(s => s.player_id != null)
        .map(s => ({
          playerId: s.player_id!,
          holeNumber: s.hole_number,
          strokes: s.strokes,
        }))}
      tournamentId={tournament.id}
    />
  )
}

function InvalidTokenView() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), #5a3e10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
            ⛳
          </div>
          <span style={{ fontFamily: 'var(--fd)', fontSize: '0.9rem', color: 'var(--gold)' }}>
            Lotus Links
          </span>
        </div>

        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
          Invalid Scoring Link
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          This link doesn&apos;t match any tournament. Ask your organizer for the correct scoring link.
        </p>
        <PoweredByFooter />
      </div>
    </div>
  )
}
