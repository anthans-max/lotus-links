'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export async function createGroup(
  tournamentId: string,
  name: string,
  chaperoneName?: string,
  startingHole?: number
) {
  const supabase = await createClient()

  // Generate unique PIN within this tournament
  const { data: existingGroups } = await supabase
    .from('groups')
    .select('pin')
    .eq('tournament_id', tournamentId)

  const usedPins = new Set(existingGroups?.map(g => g.pin) ?? [])
  let pin = generatePin()
  while (usedPins.has(pin)) {
    pin = generatePin()
  }

  const { error } = await supabase.from('groups').insert({
    tournament_id: tournamentId,
    name: name.trim(),
    chaperone_name: chaperoneName?.trim() || null,
    pin,
    starting_hole: startingHole ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function updateGroup(
  groupId: string,
  updates: {
    name?: string
    chaperone_name?: string | null
    starting_hole?: number | null
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function regenerateGroupPin(groupId: string, tournamentId: string) {
  const supabase = await createClient()

  const { data: existingGroups } = await supabase
    .from('groups')
    .select('pin')
    .eq('tournament_id', tournamentId)

  const usedPins = new Set(existingGroups?.map(g => g.pin) ?? [])
  let pin = generatePin()
  while (usedPins.has(pin)) {
    pin = generatePin()
  }

  const { error } = await supabase
    .from('groups')
    .update({ pin })
    .eq('id', groupId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient()

  // Remove all player assignments first
  await supabase.from('group_players').delete().eq('group_id', groupId)

  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}

export async function assignPlayerToGroup(groupId: string, playerId: string) {
  const supabase = await createClient()

  // Remove from any existing group first
  await supabase.from('group_players').delete().eq('player_id', playerId)

  const { error } = await supabase.from('group_players').insert({
    group_id: groupId,
    player_id: playerId,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function removePlayerFromGroup(groupId: string, playerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('group_players')
    .delete()
    .eq('group_id', groupId)
    .eq('player_id', playerId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function autoGenerateGroups(
  tournamentId: string,
  groupSize: number = 4
) {
  const supabase = await createClient()

  // Get all players for this tournament
  const { data: players } = await supabase
    .from('players')
    .select('id')
    .eq('tournament_id', tournamentId)
    .order('name')

  if (!players || players.length === 0) throw new Error('No players to group')

  // Get pairing preferences
  const { data: prefs } = await supabase
    .from('pairing_preferences')
    .select('player_id, preferred_player_id')
    .eq('tournament_id', tournamentId)

  // Build mutual preference map
  const prefMap = new Map<string, Set<string>>()
  for (const p of prefs ?? []) {
    if (!prefMap.has(p.player_id)) prefMap.set(p.player_id, new Set())
    prefMap.get(p.player_id)!.add(p.preferred_player_id)
  }

  // Find mutual pairs (both want each other)
  const mutualPairs: [string, string][] = []
  const visited = new Set<string>()
  for (const [pid, wants] of prefMap) {
    for (const wantedId of wants) {
      const key = [pid, wantedId].sort().join('-')
      if (visited.has(key)) continue
      visited.add(key)
      if (prefMap.get(wantedId)?.has(pid)) {
        mutualPairs.push([pid, wantedId])
      }
    }
  }

  // Build groups respecting mutual preferences
  const assigned = new Set<string>()
  const groups: string[][] = []

  // Start with mutual pairs as seeds
  for (const [a, b] of mutualPairs) {
    if (assigned.has(a) || assigned.has(b)) continue
    const group = [a, b]
    assigned.add(a)
    assigned.add(b)

    // Try to add one-way preferences of either player
    const wanted = new Set([
      ...(prefMap.get(a) ?? []),
      ...(prefMap.get(b) ?? []),
    ])
    for (const w of wanted) {
      if (group.length >= groupSize) break
      if (assigned.has(w)) continue
      group.push(w)
      assigned.add(w)
    }

    groups.push(group)
  }

  // Fill remaining players into existing groups or create new ones
  const remaining = players.filter(p => !assigned.has(p.id))
  let currentGroupIdx = 0

  for (const player of remaining) {
    // Check if player has a one-way preference for someone already in a group
    const playerPrefs = prefMap.get(player.id)
    let placed = false

    if (playerPrefs) {
      for (let i = 0; i < groups.length; i++) {
        if (groups[i].length >= groupSize) continue
        const hasPreferred = groups[i].some(id => playerPrefs.has(id))
        if (hasPreferred) {
          groups[i].push(player.id)
          placed = true
          break
        }
      }
    }

    if (!placed) {
      // Find a group with room, or create a new one
      const openGroup = groups.find(g => g.length < groupSize)
      if (openGroup) {
        openGroup.push(player.id)
      } else {
        groups.push([player.id])
      }
    }
  }

  // Delete existing groups and group_players for this tournament
  const { data: existingGroups } = await supabase
    .from('groups')
    .select('id')
    .eq('tournament_id', tournamentId)

  if (existingGroups && existingGroups.length > 0) {
    const groupIds = existingGroups.map(g => g.id)
    await supabase.from('group_players').delete().in('group_id', groupIds)
    await supabase.from('groups').delete().eq('tournament_id', tournamentId)
  }

  // Get existing PINs (should be empty after delete, but just in case)
  const usedPins = new Set<string>()

  // Create groups in Supabase
  for (let i = 0; i < groups.length; i++) {
    let pin = generatePin()
    while (usedPins.has(pin)) pin = generatePin()
    usedPins.add(pin)

    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        tournament_id: tournamentId,
        name: `Group ${i + 1}`,
        pin,
        starting_hole: i + 1,
      })
      .select('id')
      .single()

    if (groupError) throw new Error(groupError.message)

    // Assign players
    const gpRows = groups[i].map(playerId => ({
      group_id: newGroup.id,
      player_id: playerId,
    }))

    const { error: gpError } = await supabase.from('group_players').insert(gpRows)
    if (gpError) throw new Error(gpError.message)
  }

  revalidatePath('/dashboard')
  return { groupCount: groups.length }
}

export async function autoAssignPlayers(tournamentId: string) {
  const supabase = await createClient()

  // Get all groups for this tournament
  const { data: groups } = await supabase
    .from('groups')
    .select('id')
    .eq('tournament_id', tournamentId)
    .order('created_at')

  if (!groups || groups.length === 0) throw new Error('No groups created yet')

  // Get all players in this tournament
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('tournament_id', tournamentId)
    .order('created_at')

  if (!allPlayers || allPlayers.length === 0) throw new Error('No players to assign')

  // Get already-assigned player IDs
  const { data: assigned } = await supabase
    .from('group_players')
    .select('player_id, group_id')

  const assignedSet = new Set(assigned?.map(a => a.player_id) ?? [])
  const unassigned = allPlayers.filter(p => !assignedSet.has(p.id))

  if (unassigned.length === 0) return

  // Round-robin assignment
  const inserts = unassigned.map((player, i) => ({
    group_id: groups[i % groups.length].id,
    player_id: player.id,
  }))

  const { error } = await supabase.from('group_players').insert(inserts)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}
