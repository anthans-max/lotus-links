'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// WISH Charter School — The Lakes at El Segundo (10-hole all-par-3)
export const WISH_HOLES = [
  { hole_number: 1, par: 3, yardage: 110 },
  { hole_number: 2, par: 3, yardage: 150 },
  { hole_number: 3, par: 3, yardage: 90 },
  { hole_number: 4, par: 3, yardage: 130 },
  { hole_number: 5, par: 3, yardage: 100 },
  { hole_number: 6, par: 3, yardage: 90 },
  { hole_number: 7, par: 3, yardage: 105 },
  { hole_number: 8, par: 3, yardage: 120 },
  { hole_number: 9, par: 3, yardage: 60 },
  { hole_number: 10, par: 3, yardage: 105 },
] as const

export async function createTournament(formData: {
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
      course_name: formData.course_name,
      format: formData.format,
      status: 'draft' as const,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Insert all 10 holes
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
  updates: { name?: string; date?: string; course_name?: string; format?: string; status?: 'draft' | 'active' | 'completed' }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}
