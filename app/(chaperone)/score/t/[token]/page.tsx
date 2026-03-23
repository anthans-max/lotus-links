import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ScoreEntryApp from '@/components/chaperone/ScoreEntryApp'
import ChatAssistant from '@/components/chat/ChatAssistant'

export const metadata: Metadata = {
  title: 'Score Entry',
}

interface Props {
  params: Promise<{ token: string }>
}

export default async function TokenScoringPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  // Look up token → group_id
  const { data: tokenRow } = await supabase
    .from('group_scoring_tokens')
    .select('group_id, tournament_id, expires_at')
    .eq('token', token)
    .single()

  if (!tokenRow) {
    return <NotFoundView />
  }

  // Check expiry
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return <NotFoundView message="This scoring link has expired. Please contact your tournament organizer for a new link." />
  }

  const { group_id: groupId } = tokenRow

  // Fetch group with players
  const { data: group } = await supabase
    .from('groups')
    .select('*, group_players(player_id)')
    .eq('id', groupId)
    .single()

  if (!group) {
    return <NotFoundView message="Group not found. Please contact your tournament organizer." />
  }

  // Fetch tournament, holes, scores in parallel
  const [{ data: tournament }, { data: holes }, { data: scores }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('id, name, course, format, holes, status, league_id, leaderboard_public')
      .eq('id', group.tournament_id)
      .single(),
    supabase
      .from('holes')
      .select('*')
      .eq('tournament_id', group.tournament_id)
      .order('hole_number'),
    supabase
      .from('scores')
      .select('*')
      .eq('group_id', groupId)
      .eq('tournament_id', group.tournament_id)
      .order('hole_number'),
  ])

  if (!tournament) {
    return <NotFoundView message="Tournament not found." />
  }
  if (!holes || holes.length === 0) {
    return <NotFoundView message="No holes have been configured for this tournament yet. Ask your organizer to set up the holes." />
  }

  // Fetch league branding
  const { data: league } = await supabase
    .from('leagues')
    .select('name, primary_color, logo_url')
    .eq('id', tournament.league_id)
    .single()

  // Fetch player names
  const playerIds = (group.group_players as { player_id: string }[]).map(gp => gp.player_id)
  const { data: players } = playerIds.length > 0
    ? await supabase.from('players').select('id, name').in('id', playerIds)
    : { data: [] }

  // Resolve chaperone name: prefer formal assignment, fall back to group field
  const { data: gc } = await supabase
    .from('group_chaperones')
    .select('chaperones(name)')
    .eq('group_id', groupId)
    .single()

  const chaperoneName =
    ((gc?.chaperones as unknown) as { name: string } | null)?.name ??
    group.chaperone_name ??
    null

  return (
    <>
      <ScoreEntryApp
        group={{
          id: group.id,
          name: group.name,
          chaperoneName,
          pin: group.pin,
          status: group.status,
          currentHole: group.current_hole ?? 1,
          teeTime: group.tee_time ?? null,
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
        leagueLogoUrl={(league as any)?.logo_url ?? null}
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
      <ChatAssistant
        tournamentId={tournament.id}
        format={tournament.format}
        hasTeeTimtes={!!group.tee_time}
      />
    </>
  )
}

function NotFoundView({
  message = "This scoring link doesn't appear to be valid. Please check with your tournament organizer.",
}: {
  message?: string
}) {
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
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛳</div>
        <div
          style={{
            fontFamily: 'var(--fd)',
            fontSize: '1.5rem',
            marginBottom: '0.5rem',
            color: 'var(--text)',
          }}
        >
          Link Not Found
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {message}
        </p>
      </div>
    </div>
  )
}
