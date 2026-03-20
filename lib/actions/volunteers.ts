'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface VolunteerSignUpData {
  tournamentId: string
  name: string
  email: string
  phone?: string
  roles: string[]
  notes?: string
}

export interface Volunteer {
  id: string
  tournament_id: string
  name: string
  email: string
  phone: string | null
  roles: string[]
  notes: string | null
  created_at: string
}

export type SignUpResult =
  | { success: true }
  | { success: false; duplicate: boolean; message: string }

export async function signUpVolunteer(data: VolunteerSignUpData): Promise<SignUpResult> {
  const supabase = await createClient()

  const { error } = await supabase.from('volunteers').insert({
    tournament_id: data.tournamentId,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() || null,
    roles: data.roles,
    notes: data.notes?.trim() || null,
  })

  if (error) {
    // Unique constraint violation — duplicate email for this tournament
    if (error.code === '23505') {
      return { success: false, duplicate: true, message: "You've already signed up! Contact us if you need to update your info." }
    }
    return { success: false, duplicate: false, message: 'Something went wrong. Please try again.' }
  }

  return { success: true }
}

export async function getVolunteers(tournamentId: string): Promise<Volunteer[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch volunteers: ${error.message}`)
  return (data ?? []) as Volunteer[]
}

export async function deleteVolunteer(volunteerId: string, leagueId: string, tournamentId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('volunteers')
    .delete()
    .eq('id', volunteerId)

  if (error) throw new Error(`Failed to delete volunteer: ${error.message}`)

  revalidatePath(`/dashboard/leagues/${leagueId}/tournaments/${tournamentId}`)
}
