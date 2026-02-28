'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addPlayer(
  tournamentId: string,
  name: string,
  grade?: string,
  options?: { handicap_index?: number | null; skill_level?: string | null; player_email?: string | null }
) {
  const supabase = await createClient()

  const { error } = await supabase.from('players').insert({
    tournament_id: tournamentId,
    name: name.trim(),
    grade: grade?.trim() || null,
    handicap_index: options?.handicap_index ?? null,
    skill_level: options?.skill_level?.trim() || null,
    player_email: options?.player_email?.trim() || null,
    status: 'pre-registered',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function importPlayers(
  tournamentId: string,
  rows: { name: string; grade?: string }[]
) {
  const supabase = await createClient()

  const cleaned = rows
    .filter(r => r.name.trim().length > 0)
    .map(r => ({
      tournament_id: tournamentId,
      name: r.name.trim(),
      grade: r.grade?.trim() || null,
      status: 'pre-registered',
    }))

  if (cleaned.length === 0) return { imported: 0 }

  const { error } = await supabase.from('players').insert(cleaned)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  return { imported: cleaned.length }
}

export async function bulkAddPlayers(
  tournamentId: string,
  text: string
) {
  const supabase = await createClient()

  // Parse names from text — supports newline-separated and comma-separated
  const names = text
    .split(/[\n,]/)
    .map(n => n.trim())
    .filter(n => n.length > 0)

  if (names.length === 0) return { added: 0 }

  const rows = names.map(name => ({
    tournament_id: tournamentId,
    name,
    status: 'pre-registered',
  }))

  const { error } = await supabase.from('players').insert(rows)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  return { added: names.length }
}

export async function updatePlayer(
  playerId: string,
  updates: { name?: string; grade?: string | null; handicap?: number; handicap_index?: number | null; skill_level?: string | null; player_email?: string | null }
) {
  const supabase = await createClient()

  const cleaned: Record<string, unknown> = {}
  if (updates.name !== undefined) cleaned.name = updates.name.trim()
  if (updates.grade !== undefined) cleaned.grade = updates.grade?.trim() || null
  if (updates.handicap !== undefined) cleaned.handicap = updates.handicap
  if (updates.handicap_index !== undefined) cleaned.handicap_index = updates.handicap_index
  if (updates.skill_level !== undefined) cleaned.skill_level = updates.skill_level?.trim() || null
  if (updates.player_email !== undefined) cleaned.player_email = updates.player_email?.trim() || null

  const { error } = await supabase
    .from('players')
    .update(cleaned)
    .eq('id', playerId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function checkInPlayer(playerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('players')
    .update({ status: 'checked_in' })
    .eq('id', playerId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function undoCheckIn(playerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('players')
    .update({ status: 'registered' })
    .eq('id', playerId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function deletePlayer(playerId: string) {
  const supabase = await createClient()

  // Remove pairing preferences
  await supabase.from('pairing_preferences').delete().eq('player_id', playerId)
  await supabase.from('pairing_preferences').delete().eq('preferred_player_id', playerId)

  // Remove from any groups
  await supabase.from('group_players').delete().eq('player_id', playerId)

  const { error } = await supabase.from('players').delete().eq('id', playerId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}
