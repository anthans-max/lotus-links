'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addPlayer(tournamentId: string, name: string, grade?: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('players').insert({
    tournament_id: tournamentId,
    name: name.trim(),
    grade: grade?.trim() || null,
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
    }))

  if (cleaned.length === 0) return { imported: 0 }

  const { error } = await supabase.from('players').insert(cleaned)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  return { imported: cleaned.length }
}

export async function deletePlayer(playerId: string) {
  const supabase = await createClient()

  // Remove from any groups first
  await supabase.from('group_players').delete().eq('player_id', playerId)

  const { error } = await supabase.from('players').delete().eq('id', playerId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}
