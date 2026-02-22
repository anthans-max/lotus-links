'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { WISH_HOLES } from '@/lib/course-data'

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
