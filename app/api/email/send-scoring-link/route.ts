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

    // Send sequentially with 600ms gap to stay under Resend's 2 req/s rate limit
    const results: Array<{ status: 'fulfilled' } | { status: 'rejected'; name: string; email: string; reason: string }> = []
    for (const p of playersWithEmail) {
      try {
        await sendPlayerScoringEmail({
          to: p.player_email!,
          playerName: p.name,
          groupName: group.name,
          players: allPlayerNames,
          scoringUrl,
          tournamentName: tournament.name,
          courseName: tournament.course,
          tournamentDate: tournament.date,
        })
        results.push({ status: 'fulfilled' })
      } catch (err) {
        results.push({ status: 'rejected', name: p.name, email: p.player_email!, reason: (err as Error)?.message ?? 'Unknown error' })
      }
      // 600ms between sends — stays comfortably under 2 req/s
      await new Promise(res => setTimeout(res, 600))
    }

    const sent = results.filter(r => r.status === 'fulfilled').length
    const errors = results.filter((r): r is { status: 'rejected'; name: string; email: string; reason: string } => r.status === 'rejected')

    if (errors.length > 0) console.error('[send-scoring-link] failures:', JSON.stringify(errors))

    return NextResponse.json({ sent, failed: errors.length, errors })
  }

  // ─── All-players mode: send to every player with email across all groups ──────
  if (body.mode === 'all-players') {
    const { tournamentId, baseUrl } = body as {
      mode: 'all-players'
      tournamentId: string
      baseUrl: string
    }

    if (!tournamentId || !baseUrl) {
      return NextResponse.json({ error: 'Missing tournamentId or baseUrl' }, { status: 400 })
    }

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, name, course, date, public_token')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const { data: groups } = await supabase
      .from('groups')
      .select('id, name, group_players(player_id)')
      .eq('tournament_id', tournamentId)

    if (!groups || groups.length === 0) {
      return NextResponse.json({ error: 'No groups found' }, { status: 400 })
    }

    // Gather all player IDs across all groups
    const allPlayerIds = groups.flatMap(g => (g.group_players as { player_id: string }[]).map(gp => gp.player_id))
    const { data: allPlayers } = allPlayerIds.length > 0
      ? await supabase.from('players').select('id, name, player_email').in('id', allPlayerIds)
      : { data: [] as { id: string; name: string; player_email: string | null }[] }

    const playerMap = new Map((allPlayers ?? []).map(p => [p.id, p]))

    // Build one task per player-with-email, preserving group context
    const tasks: Array<{ player: { id: string; name: string; player_email: string }; groupName: string; allGroupPlayerNames: string[] }> = []
    for (const group of groups) {
      const groupPlayerIds = (group.group_players as { player_id: string }[]).map(gp => gp.player_id)
      const groupPlayers = groupPlayerIds.map(id => playerMap.get(id)).filter(Boolean) as { id: string; name: string; player_email: string | null }[]
      const allGroupPlayerNames = groupPlayers.map(p => p.name)
      const scoringUrl = tournament.public_token
        ? `${baseUrl}/t/${tournament.public_token}?group=${group.id}`
        : `${baseUrl}/score/${group.id}`

      for (const p of groupPlayers) {
        if (!p.player_email) continue
        tasks.push({ player: { id: p.id, name: p.name, player_email: p.player_email }, groupName: group.name, allGroupPlayerNames })
        // Store scoringUrl per task by closing over group
        ;(tasks[tasks.length - 1] as typeof tasks[0] & { scoringUrl: string }).scoringUrl = scoringUrl
      }
    }

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'No players with email found' }, { status: 400 })
    }

    // Send sequentially — 600ms gap to stay under Resend's 2 req/s limit
    let sent = 0
    const errors: Array<{ name: string; email: string; reason: string }> = []
    for (const task of tasks) {
      const { scoringUrl } = task as typeof tasks[0] & { scoringUrl: string }
      try {
        await sendPlayerScoringEmail({
          to: task.player.player_email,
          playerName: task.player.name,
          groupName: task.groupName,
          players: task.allGroupPlayerNames,
          scoringUrl,
          tournamentName: tournament.name,
          courseName: tournament.course,
          tournamentDate: tournament.date,
        })
        sent++
      } catch (err) {
        errors.push({ name: task.player.name, email: task.player.player_email, reason: (err as Error)?.message ?? 'Unknown error' })
      }
      await new Promise(res => setTimeout(res, 600))
    }

    if (errors.length > 0) console.error('[send-scoring-link] all-players failures:', JSON.stringify(errors))

    return NextResponse.json({ sent, failed: errors.length, errors })
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
      .select('id, name, date, course, holes, slope_rating, course_rating, stableford_points_config, format')
      .eq('id', tournamentId)
      .single()

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    const [{ data: holes }, { data: players }, { data: scores }] = await Promise.all([
      supabase.from('holes').select('hole_number, par, handicap, yardage').eq('tournament_id', tournamentId).order('hole_number'),
      supabase.from('players').select('id, name, handicap, handicap_index, player_email').eq('tournament_id', tournamentId).order('name'),
      supabase.from('scores').select('player_id, hole_number, strokes').eq('tournament_id', tournamentId).not('player_id', 'is', null),
    ])

    const holeList = (holes ?? []).map(h => ({ number: h.hole_number, par: h.par, strokeIndex: h.handicap as number | null, yardage: (h as any).yardage as number | null }))
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
        const pts = raw != null ? computeStablefordPoints(raw, h.par, received, stablefordConfig) : null
        const adjScore = raw != null ? Math.min(raw, h.par + 2 + received) : null
        if (raw != null) totalGross += raw
        if (adjScore != null) totalNet += adjScore
        if (pts != null) totalPts += pts
        return { number: h.number, par: h.par, raw: raw ?? 0, net: adjScore ?? 0, pts: pts ?? 0, received, strokeIndex: h.strokeIndex, adjScore: adjScore ?? 0, yardage: h.yardage }
      })
      const netVsPar = totalNet - totalPar
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { id: p.id, name: p.name, email: (p as any).player_email as string | null, totalPts, totalGross, totalNet, netVsPar, holeDetails }
    })

    const isStrokePlayFormat = (tournament as any).format === 'Stroke Play'
    const ranked = [...computedPlayers].sort((a, b) =>
      isStrokePlayFormat ? a.netVsPar - b.netVsPar : b.totalPts - a.totalPts
    )
    const leaderboardSummary = ranked.map((p, i) => ({ rank: i + 1, name: p.name, totalPts: p.totalPts, gross: p.totalGross, netVsPar: p.netVsPar }))

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
          format: (tournament as any).format ?? 'Stableford',
          leaderboard: leaderboardSummary.map(entry => ({
            ...entry,
            isRecipient: entry.name === p.name,
          })),
          recipientSummary: {
            holes: p.holeDetails,
            gross: p.totalGross,
            net: p.totalNet,
            totalPts: p.totalPts,
            netVsPar: p.netVsPar,
          },
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({ sent, failed, skipped })
  }

  // ─── Chaperone-token mode: token URL email to formally assigned chaperone ─────
  if (body.mode === 'chaperone-token') {
    const { groupId, baseUrl } = body as {
      mode: 'chaperone-token'
      groupId: string
      baseUrl: string
    }

    if (!groupId || !baseUrl) {
      return NextResponse.json({ error: 'Missing groupId or baseUrl' }, { status: 400 })
    }

    // Get the assigned chaperone for this group
    const { data: gc } = await supabase
      .from('group_chaperones')
      .select('chaperones(id, name, email), group_id')
      .eq('group_id', groupId)
      .single()

    const chaperone = (gc?.chaperones as unknown) as { id: string; name: string; email: string | null } | null

    if (!chaperone?.email) {
      return NextResponse.json({ error: 'No chaperone with email assigned to this group' }, { status: 400 })
    }

    // Fetch group + tournament
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

    // Get or create scoring token
    const { data: existingToken } = await supabase
      .from('group_scoring_tokens')
      .select('token')
      .eq('group_id', groupId)
      .eq('tournament_id', group.tournament_id)
      .single()

    let token: string
    if (existingToken?.token) {
      token = existingToken.token
    } else {
      const { data: newToken, error: tokenErr } = await supabase
        .from('group_scoring_tokens')
        .insert({ group_id: groupId, tournament_id: group.tournament_id })
        .select('token')
        .single()
      if (tokenErr || !newToken) {
        return NextResponse.json({ error: 'Failed to create scoring token' }, { status: 500 })
      }
      token = newToken.token
    }

    const playerIds = (group.group_players as { player_id: string }[]).map(gp => gp.player_id)
    const { data: players } = playerIds.length > 0
      ? await supabase.from('players').select('name').in('id', playerIds)
      : { data: [] as { name: string }[] }

    try {
      await sendScoringLinkEmail({
        to: chaperone.email,
        groupName: group.name,
        chaperoneName: chaperone.name,
        players: (players ?? []).map(p => p.name),
        startingHole: group.starting_hole ?? 1,
        scoringUrl: `${baseUrl}/score/t/${token}`,
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

  // ─── All-chaperones-token: send token links to all assigned chaperones ─────────
  if (body.mode === 'all-chaperones-token') {
    const { tournamentId, baseUrl } = body as {
      mode: 'all-chaperones-token'
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

    // Get all group_chaperones with email for this tournament's groups
    const { data: gcRows } = await supabase
      .from('group_chaperones')
      .select('group_id, chaperones(id, name, email)')
      .in(
        'group_id',
        (await supabase.from('groups').select('id').eq('tournament_id', tournamentId)).data?.map(g => g.id) ?? []
      )

    const eligible = (gcRows ?? []).filter(
      gc => ((gc.chaperones as unknown) as { email: string | null } | null)?.email
    )

    if (eligible.length === 0) {
      return NextResponse.json({ error: 'No groups with an assigned chaperone email' }, { status: 400 })
    }

    // Fetch all groups + players in one pass
    const groupIds = eligible.map(gc => gc.group_id)
    const { data: groups } = await supabase
      .from('groups')
      .select('*, group_players(player_id)')
      .in('id', groupIds)

    const allPlayerIds = (groups ?? []).flatMap(
      g => (g.group_players as { player_id: string }[]).map(gp => gp.player_id)
    )
    const { data: allPlayers } = allPlayerIds.length > 0
      ? await supabase.from('players').select('id, name').in('id', allPlayerIds)
      : { data: [] as { id: string; name: string }[] }
    const playerMap = new Map((allPlayers ?? []).map(p => [p.id, p.name]))

    // Ensure tokens exist for all groups (upsert)
    const tokenInserts = groupIds.map(gid => ({ group_id: gid, tournament_id: tournamentId }))
    await supabase.from('group_scoring_tokens').upsert(tokenInserts, { onConflict: 'group_id, tournament_id', ignoreDuplicates: true })

    const { data: tokenRows } = await supabase
      .from('group_scoring_tokens')
      .select('group_id, token')
      .in('group_id', groupIds)
      .eq('tournament_id', tournamentId)
    const tokenByGroup = new Map((tokenRows ?? []).map(t => [t.group_id, t.token]))

    const results = await Promise.allSettled(
      eligible.map(gc => {
        const chaperone = (gc.chaperones as unknown) as { name: string; email: string }
        const group = (groups ?? []).find(g => g.id === gc.group_id)
        if (!group) return Promise.reject(new Error('Group not found'))

        const token = tokenByGroup.get(gc.group_id)
        if (!token) return Promise.reject(new Error('Token not found'))

        const playerIds = (group.group_players as { player_id: string }[]).map(gp => gp.player_id)
        const playerNames = playerIds.map(id => playerMap.get(id) ?? 'Unknown')

        return sendScoringLinkEmail({
          to: chaperone.email,
          groupName: group.name,
          chaperoneName: chaperone.name,
          players: playerNames,
          startingHole: group.starting_hole ?? 1,
          scoringUrl: `${baseUrl}/score/t/${token}`,
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
