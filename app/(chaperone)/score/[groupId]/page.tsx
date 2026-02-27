import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ScoreEntryApp from '@/components/chaperone/ScoreEntryApp'

export const metadata: Metadata = {
  title: 'Score Entry',
}

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function ScoreEntryPage({ params }: Props) {
  const { groupId } = await params
  const supabase = await createClient()

  // Fetch group with players
  const { data: group } = await supabase
    .from('groups')
    .select('*, group_players(player_id)')
    .eq('id', groupId)
    .single()

  if (!group) {
    return <NotFoundView />
  }

  // Fetch tournament, holes, players, existing scores in parallel
  const [{ data: tournament }, { data: holes }, { data: scores }] = await Promise.all([
    supabase.from('tournaments').select('id, name, course, format, holes, status, league_id, leaderboard_public').eq('id', group.tournament_id).single(),
    supabase.from('holes').select('*').eq('tournament_id', group.tournament_id).order('hole_number'),
    supabase.from('scores').select('*').eq('group_id', groupId).eq('tournament_id', group.tournament_id).order('hole_number'),
  ])

  if (!tournament || !holes || holes.length === 0) {
    return <NotFoundView />
  }

  // Fetch league name + color
  const { data: league } = await supabase
    .from('leagues')
    .select('name, primary_color')
    .eq('id', tournament.league_id)
    .single()

  // Fetch player names
  const playerIds = (group.group_players as { player_id: string }[]).map(gp => gp.player_id)
  const { data: players } = playerIds.length > 0
    ? await supabase.from('players').select('id, name').in('id', playerIds)
    : { data: [] }

  return (
    <ScoreEntryApp
      group={{
        id: group.id,
        name: group.name,
        chaperoneName: group.chaperone_name ?? null,
        pin: group.pin,
        status: group.status,
        currentHole: group.current_hole ?? 1,
      }}
      tournament={{
        id: tournament.id,
        name: tournament.name,
        course: tournament.course,
        format: tournament.format,
        status: tournament.status,
        leaderboardPublic: tournament.leaderboard_public ?? false,
      }}
      leagueName={league?.name ?? ''}
      leagueColor={league?.primary_color ?? undefined}
      holes={holes.map(h => ({
        number: h.hole_number,
        par: h.par,
        yardage: h.yardage,
      }))}
      players={(players ?? []).map(p => p.name)}
      existingScores={(scores ?? []).map(s => ({
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
          Group Not Found
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          This scoring link doesn&apos;t match any group. Please check with your tournament organizer.
        </p>
      </div>
    </div>
  )
}
