import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendScoringLinkEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth gate — admin only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // ─── Single mode: send one email ────────────────────────────────────────────
  if (body.mode === 'single') {
    const { groupId, email, baseUrl } = body as {
      mode: 'single'
      groupId: string
      email: string
      baseUrl: string
    }

    if (!groupId || !email || !baseUrl) {
      return NextResponse.json({ error: 'Missing groupId, email, or baseUrl' }, { status: 400 })
    }

    // Fetch group + players + tournament
    const { data: group } = await supabase
      .from('groups')
      .select('*, group_players(player_id)')
      .eq('id', groupId)
      .single()

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name, course, date')
      .eq('id', group.tournament_id)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const playerIds = (group.group_players as { player_id: string }[]).map(gp => gp.player_id)
    const { data: players } = playerIds.length > 0
      ? await supabase.from('players').select('name').in('id', playerIds)
      : { data: [] as { name: string }[] }

    try {
      await sendScoringLinkEmail({
        to: email,
        groupName: group.name,
        chaperoneName: group.chaperone_name ?? null,
        players: (players ?? []).map(p => p.name),
        startingHole: group.starting_hole ?? 1,
        scoringUrl: `${baseUrl}/score/${group.id}`,
        tournamentName: tournament.name,
        courseName: tournament.course,
        tournamentDate: tournament.date,
      })

      return NextResponse.json({ success: true })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to send email' },
        { status: 500 }
      )
    }
  }

  // ─── Bulk mode: send to all groups with emails ──────────────────────────────
  if (body.mode === 'bulk') {
    const { tournamentId, baseUrl } = body as {
      mode: 'bulk'
      tournamentId: string
      baseUrl: string
    }

    if (!tournamentId || !baseUrl) {
      return NextResponse.json({ error: 'Missing tournamentId or baseUrl' }, { status: 400 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name, course, date')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Fetch all groups with chaperone_email set
    const { data: groups } = await supabase
      .from('groups')
      .select('*, group_players(player_id)')
      .eq('tournament_id', tournamentId)
      .not('chaperone_email', 'is', null)

    if (!groups || groups.length === 0) {
      return NextResponse.json({ error: 'No groups with chaperone emails' }, { status: 400 })
    }

    // Gather all player IDs across groups
    const allPlayerIds = groups.flatMap(
      g => (g.group_players as { player_id: string }[]).map(gp => gp.player_id)
    )
    const { data: allPlayers } = allPlayerIds.length > 0
      ? await supabase.from('players').select('id, name').in('id', allPlayerIds)
      : { data: [] as { id: string; name: string }[] }

    const playerMap = new Map((allPlayers ?? []).map(p => [p.id, p.name]))

    const results = await Promise.allSettled(
      groups.map(group => {
        const playerIds = (group.group_players as { player_id: string }[]).map(gp => gp.player_id)
        const playerNames = playerIds.map(id => playerMap.get(id) ?? 'Unknown')

        return sendScoringLinkEmail({
          to: group.chaperone_email!,
          groupName: group.name,
          chaperoneName: group.chaperone_name ?? null,
          players: playerNames,
          startingHole: group.starting_hole ?? 1,
          scoringUrl: `${baseUrl}/score/${group.id}`,
          tournamentName: tournament.name,
          courseName: tournament.course,
          tournamentDate: tournament.date,
        })
      })
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({ sent, failed })
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}
