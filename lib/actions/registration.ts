'use server'

import { createClient } from '@/lib/supabase/server'

export async function registerPlayers(data: {
  tournamentId: string
  playerIds: string[]
  parentName: string
  parentPhone: string
  pairingPreferences: Record<string, string[]> // playerId -> preferred player IDs
}) {
  const supabase = await createClient()

  // Update each selected player's registration info
  for (const playerId of data.playerIds) {
    const { error } = await supabase
      .from('players')
      .update({
        status: 'registered',
        parent_name: data.parentName.trim(),
        parent_phone: data.parentPhone.trim(),
        registered_at: new Date().toISOString(),
      })
      .eq('id', playerId)

    if (error) throw new Error(`Failed to register player: ${error.message}`)
  }

  // Delete existing pairing preferences for these players (allow re-registration)
  for (const playerId of data.playerIds) {
    await supabase
      .from('pairing_preferences')
      .delete()
      .eq('player_id', playerId)
  }

  // Insert new pairing preferences
  const prefRows: { tournament_id: string; player_id: string; preferred_player_id: string }[] = []
  for (const [playerId, preferredIds] of Object.entries(data.pairingPreferences)) {
    for (const preferredId of preferredIds) {
      prefRows.push({
        tournament_id: data.tournamentId,
        player_id: playerId,
        preferred_player_id: preferredId,
      })
    }
  }

  if (prefRows.length > 0) {
    const { error } = await supabase.from('pairing_preferences').insert(prefRows)
    if (error) throw new Error(`Failed to save pairing preferences: ${error.message}`)
  }

  return { registered: data.playerIds.length }
}

export async function addAndRegisterPlayer(data: {
  tournamentId: string
  name: string
  grade?: string
  parentName: string
  parentPhone: string
}) {
  const supabase = await createClient()

  const { data: player, error } = await supabase
    .from('players')
    .insert({
      tournament_id: data.tournamentId,
      name: data.name.trim(),
      grade: data.grade?.trim() || null,
      status: 'registered',
      parent_name: data.parentName.trim(),
      parent_phone: data.parentPhone.trim(),
      registered_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return player
}
