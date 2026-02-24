'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createLeague(formData: {
  name: string
  admin_email: string
  primary_color: string
  logo_url?: string | null
}) {
  const supabase = await createClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .insert({
      name: formData.name,
      admin_email: formData.admin_email,
      primary_color: formData.primary_color,
      logo_url: formData.logo_url || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/leagues')
  return league
}

export async function updateLeague(
  id: string,
  formData: {
    name?: string
    admin_email?: string
    primary_color?: string
    logo_url?: string | null
  }
) {
  const supabase = await createClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/leagues')
  revalidatePath(`/dashboard/leagues/${id}`)
  return league
}

export async function deleteLeague(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('leagues')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/leagues')
}
