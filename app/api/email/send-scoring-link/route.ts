import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendScoringLinkEmail, sendPlayerScoringEmail, sendScorecardSummaryEmail } from '@/lib/email'
import { computeCourseHandicap, getStrokesOnHole } from '@/lib/scoring/handicap'
import { computeStablefordPoints, parseStablefordConfig } from '@/lib/scoring/stableford'

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

  // ─── Group-players mode: send to all players in group with player_email ───────
  if (body.mode === 'group-players') {
    const { groupId, baseUrl } = body as {
      mode: 'group-players'
      groupId: string
      baseUrl: string
    }

    if (!groupId || !baseUrl) {
      return NextResponse.json({ error: 'Missing groupId or baseUrl' }, { status: 400 })
    }

    // Fetch group + tournament + players
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
      .select('id, name, course, date, public_token')
      .eq('id', group.tournament_id)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const scoringUrl = tournament.public_token
      ? `${baseUrl}/t/${tournament.public_token}?group=${group.id}`
      : `${baseUrl}/score/${group.id}`

    const playerIds = (group.group_players as { player_id: string }[]).map(gp => gp.player_id)
    const { data: players } = playerIds.length > 0
      ? await supabase.from('players').select('id, name, player_email').in('id', playerIds)
      : { data: [] as { id: string; name: string; player_email: string | null }[] }

    const playersWithEmail = (players ?? []).filter(p => p.player_email)
    if (playersWithEmail.length === 0) {
      return NextResponse.json({ error: 'No players with email in this group' }, { status: 400 })
    }

    const allPlayerNames = (players ?? []).map(p => p.name)

    const results = await Promise.allSettled(
      playersWithEmail.map(p =>
        sendPlayerScoringEmail({
          to: p.player_email!,
          playerName: p.name,
          groupName: group.name,
          players: allPlayerNames,
          scoringUrl,
          tournamentName: tournament.name,
          courseName: tournament.course,
          tournamentDate: tournament.date,
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({ sent, failed })
  }

  // ─── Scorecard summary mode: send post-round scorecard to all players ─────────
  if (body.mode === 'scorecard-summary') {
    const { tournamentId, baseUrl } = body as {
      mode: 'scorecard-summary'
      tournamentId: string
      baseUrl: string
    }

    if (!tournamentId || !baseUrl) {
      return NextResponse.json({ error: 'Missing tournamentId or baseUrl' }, { status: 400 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name, date, course, holes, slope_rating, course_rating, stableford_points_config')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const [{ data: holes }, { data: players }, { data: scores }] = await Promise.all([
      supabase.from('holes').select('hole_number, par, handicap').eq('tournament_id', tournamentId).order('hole_number'),
      supabase.from('players').select('id, name, handicap, handicap_index, player_email').eq('tournament_id', tournamentId).order('name'),
      supabase.from('scores').select('player_id, hole_number, strokes').eq('tournament_id', tournamentId).not('player_id', 'is', null),
    ])

    const holeList = (holes ?? []).map(h => ({ number: h.hole_number, par: h.par, strokeIndex: h.handicap as number | null }))
    const totalPar = holeList.reduce((s, h) => s + h.par, 0)
    const holeCount = tournament.holes ?? holeList.length
    const stablefordConfig = parseStablefordConfig(tournament.stableford_points_config)
    const slope = tournament.slope_rating ?? 113
    const courseRatingVal = tournament.course_rating ?? totalPar

    // Build score lookup
    const scoreMap = new Map<string, Map<number, number>>()
    for (const s of scores ?? []) {
      if (!s.player_id) continue
      if (!scoreMap.has(s.player_id)) scoreMap.set(s.player_id, new Map())
      scoreMap.get(s.player_id)!.set(s.hole_number, s.strokes)
    }

    // Compute all players ranked
    const computedPlayers = (players ?? []).map(p => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handicapIndex = (p as any).handicap_index as number | null
      const courseHcp = handicapIndex != null
        ? computeCourseHandicap(handicapIndex, slope, courseRatingVal, totalPar)
        : (p.handicap ?? 0)
      const playerScores = scoreMap.get(p.id) ?? new Map<number, number>()
      let totalPts = 0
      let totalGross = 0
      let totalNet = 0
      const holeDetails = holeList.map(h => {
        const raw = playerScores.get(h.number) ?? null
        const received = courseHcp > 0 ? getStrokesOnHole(courseHcp, h.strokeIndex, holeCount) : 0
        const net = raw != null ? raw - received : null
        const pts = raw != null ? computeStablefordPoints(raw, h.par, received, stablefordConfig) : null
        if (raw != null) totalGross += raw
        if (net != null) totalNet += net
        if (pts != null) totalPts += pts
        return { number: h.number, par: h.par, raw: raw ?? 0, net: net ?? 0, pts: pts ?? 0, received }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { id: p.id, name: p.name, email: (p as any).player_email as string | null, totalPts, totalGross, totalNet, holeDetails }
    })

    const ranked = [...computedPlayers].sort((a, b) => b.totalPts - a.totalPts)
    const leaderboardSummary = ranked.map((p, i) => ({ rank: i + 1, name: p.name, totalPts: p.totalPts, gross: p.totalGross }))

    const playersWithEmail = computedPlayers.filter(p => p.email)
    const skipped = computedPlayers.length - playersWithEmail.length

    const scorecardUrl = `${baseUrl}/scorecard/${tournamentId}`
    const formattedDate = (() => {
      try {
        return new Date(tournament.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      } catch { return tournament.date }
    })()

    const results = await Promise.allSettled(
      playersWithEmail.map(p =>
        sendScorecardSummaryEmail({
          to: p.email!,
          playerName: p.name,
          tournamentName: tournament.name,
          courseName: tournament.course,
          tournamentDate: formattedDate,
          scorecardUrl,
          leaderboard: leaderboardSummary.map(entry => ({
            ...entry,
            isRecipient: entry.name === p.name,
          })),
          recipientSummary: {
            holes: p.holeDetails,
            gross: p.totalGross,
            net: p.totalNet,
            totalPts: p.totalPts,
          },
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({ sent, failed, skipped })
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
}
