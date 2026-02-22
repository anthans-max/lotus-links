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
