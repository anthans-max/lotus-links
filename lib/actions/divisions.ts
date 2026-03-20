'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Division } from '@/lib/types'

// Grade → division bucket index (0 = youngest, 2 = oldest)
function gradeToBucket(grade: string | null | undefined): number | null {
  if (!grade) return null
  const g = grade.trim()
  if (g === '3' || g === '4') return 0
  if (g === '5') return 1
  if (g === '6' || g === '7' || g === '8') return 2
  return null
}

export async function getDivisions(tournamentId: string): Promise<Division[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('divisions')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('display_order')
  return (data ?? []) as Division[]
}

export async function createDivision(
  tournamentId: string,
  leagueId: string,
  name: string,
  description?: string,
  displayOrder?: number
) {
  const supabase = await createClient()
  const { error } = await supabase.from('divisions').insert({
    tournament_id: tournamentId,
    name: name.trim(),
    description: description?.trim() || null,
    display_order: displayOrder ?? 0,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/leagues/${leagueId}/tournaments/${tournamentId}/groups`)
}

export async function updateDivision(
  divisionId: string,
  leagueId: string,
  tournamentId: string,
  updates: { name?: string; description?: string | null; display_order?: number }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('divisions')
    .update({
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.description !== undefined ? { description: updates.description?.trim() || null } : {}),
      ...(updates.display_order !== undefined ? { display_order: updates.display_order } : {}),
    })
    .eq('id', divisionId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/leagues/${leagueId}/tournaments/${tournamentId}/groups`)
}

export async function deleteDivision(
  divisionId: string,
  leagueId: string,
  tournamentId: string
) {
  const supabase = await createClient()
  const { error } = await supabase.from('divisions').delete().eq('id', divisionId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/leagues/${leagueId}/tournaments/${tournamentId}/groups`)
}

export async function createWishDefaultDivisions(
  tournamentId: string,
  leagueId: string
): Promise<Division[]> {
  const supabase = await createClient()

  // Remove existing divisions first
  await supabase.from('divisions').delete().eq('tournament_id', tournamentId)

  const defaults = [
    { name: 'Division 3', description: '3rd & 4th Grade', display_order: 1 },
    { name: 'Division 2', description: '5th Grade', display_order: 2 },
    { name: 'Division 1', description: '6th, 7th & 8th Grade', display_order: 3 },
  ]

  const { data, error } = await supabase
    .from('divisions')
    .insert(defaults.map(d => ({ ...d, tournament_id: tournamentId })))
    .select('*')

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/leagues/${leagueId}/tournaments/${tournamentId}/groups`)
  return (data ?? []) as Division[]
}

export async function assignGroupDivision(
  groupId: string,
  divisionId: string | null,
  leagueId: string,
  tournamentId: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('groups')
    .update({ division_id: divisionId })
    .eq('id', groupId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/leagues/${leagueId}/tournaments/${tournamentId}/groups`)
}

export interface AutoAssignResult {
  assigned: number
  unassigned: number
}

export async function autoAssignDivisions(
  tournamentId: string,
  leagueId: string
): Promise<AutoAssignResult> {
  const supabase = await createClient()

  // Fetch divisions sorted by display_order
  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, display_order')
    .eq('tournament_id', tournamentId)
    .order('display_order')

  if (!divisions || divisions.length < 2) {
    throw new Error('At least 2 divisions are required for auto-assignment')
  }

  // Map bucket index → division id (sorted by display_order)
  // bucket 0 = youngest (grades 3-4), bucket 1 = middle (grade 5), bucket 2 = oldest (grades 6-8)
  const bucketToDiv: Record<number, string> = {}
  bucketToDiv[0] = divisions[0].id
  bucketToDiv[2] = divisions[divisions.length - 1].id
  if (divisions.length >= 3) {
    // Use middle division for grade 5
    const mid = Math.floor(divisions.length / 2)
    bucketToDiv[1] = divisions[mid].id
  } else {
    // Only 2 divisions: map grade 5 to youngest (or leave unassigned)
    bucketToDiv[1] = divisions[0].id
  }

  // Fetch groups
  const { data: groups } = await supabase
    .from('groups')
    .select('id')
    .eq('tournament_id', tournamentId)

  if (!groups || groups.length === 0) return { assigned: 0, unassigned: 0 }

  // Fetch group_players with player grades
  const groupIds = groups.map(g => g.id)
  const { data: gpRows } = await supabase
    .from('group_players')
    .select('group_id, player_id')
    .in('group_id', groupIds)

  const playerIds = (gpRows ?? []).map(gp => gp.player_id)
  const { data: playerRows } = playerIds.length > 0
    ? await supabase.from('players').select('id, grade').in('id', playerIds)
    : { data: [] as { id: string; grade: string | null }[] }

  const playerGradeMap = new Map((playerRows ?? []).map(p => [p.id, p.grade]))

  // For each group, find majority grade bucket
  const groupPlayersByGroup: Record<string, string[]> = {}
  for (const gp of gpRows ?? []) {
    if (!groupPlayersByGroup[gp.group_id]) groupPlayersByGroup[gp.group_id] = []
    groupPlayersByGroup[gp.group_id].push(gp.player_id)
  }

  let assigned = 0
  let unassigned = 0

  for (const group of groups) {
    const playerIdsInGroup = groupPlayersByGroup[group.id] ?? []
    const bucketCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0 }

    for (const pid of playerIdsInGroup) {
      const grade = playerGradeMap.get(pid)
      const bucket = gradeToBucket(grade)
      if (bucket !== null) {
        bucketCounts[bucket] = (bucketCounts[bucket] ?? 0) + 1
      }
    }

    const maxCount = Math.max(bucketCounts[0], bucketCounts[1], bucketCounts[2])
    if (maxCount === 0) {
      // No grades — leave unassigned
      unassigned++
      continue
    }

    // Find bucket with max count; check for tie
    const topBuckets = [0, 1, 2].filter(b => bucketCounts[b] === maxCount)
    if (topBuckets.length > 1) {
      // Tie — leave unassigned
      unassigned++
      continue
    }

    const majorityBucket = topBuckets[0]
    const divisionId = bucketToDiv[majorityBucket]
    if (!divisionId) {
      unassigned++
      continue
    }

    await supabase.from('groups').update({ division_id: divisionId }).eq('id', group.id)
    assigned++
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/tournaments/${tournamentId}/groups`)
  return { assigned, unassigned }
}

export async function setResultsPublished(
  tournamentId: string,
  leagueId: string,
  published: boolean
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tournaments')
    .update({ results_published: published })
    .eq('id', tournamentId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/leagues/${leagueId}/tournaments/${tournamentId}`)
  revalidatePath(`/leaderboard/${tournamentId}`)
}
