'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { WISH_HOLES } from '@/lib/course-data'

export async function createTournament(formData: {
  league_id: string
  name: string
  date: string
  course: string
  format: string
  holes: number
  shotgun_start: boolean
  notes?: string
}) {
  const supabase = await createClient()

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      league_id: formData.league_id,
      name: formData.name,
      date: formData.date,
      course: formData.course,
      format: formData.format,
      holes: formData.holes,
      shotgun_start: formData.shotgun_start,
      notes: formData.notes || null,
      status: 'upcoming',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/leagues/${formData.league_id}`)
  revalidatePath('/dashboard')
  return tournament
}

export async function createTournamentWithWishHoles(formData: {
  name: string
  date: string
  course_name: string
  format: string
}) {
  const supabase = await createClient()

  const { data: tournament, error } = await supabase
    .from('tournaments')
    .insert({
      name: formData.name,
      date: formData.date,
      course: formData.course_name,
      format: formData.format,
      status: 'upcoming' as const,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const holesData = WISH_HOLES.map(h => ({
    tournament_id: tournament.id,
    hole_number: h.hole_number,
    par: h.par,
    yardage: h.yardage,
  }))

  const { error: holesError } = await supabase.from('holes').insert(holesData)
  if (holesError) throw new Error(holesError.message)

  revalidatePath('/dashboard')
  return tournament
}

export async function updateTournament(
  id: string,
  updates: {
    name?: string
    date?: string
    course?: string
    format?: string
    status?: 'upcoming' | 'active' | 'completed'
    shotgun_start?: boolean
    notes?: string
  }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}

export async function deleteTournament(id: string, leagueId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/leagues/${leagueId}`)
  revalidatePath('/dashboard')
}

export async function upsertHoles(
  tournamentId: string,
  leagueId: string,
  holes: { hole_number: number; par: number; yardage: number | null; handicap: number | null }[]
) {
  const supabase = await createClient()

  // Delete existing holes, then insert fresh
  await supabase
    .from('holes')
    .delete()
    .eq('tournament_id', tournamentId)

  const holesData = holes.map(h => ({
    tournament_id: tournamentId,
    hole_number: h.hole_number,
    par: h.par,
    yardage: h.yardage,
    handicap: h.handicap,
  }))

  const { error } = await supabase.from('holes').insert(holesData)
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/leagues/${leagueId}/tournaments/${tournamentId}`)
  revalidatePath(`/dashboard/leagues/${leagueId}/tournaments/${tournamentId}/holes`)
}
