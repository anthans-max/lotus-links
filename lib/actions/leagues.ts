'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendLeagueAdminInviteEmail } from '@/lib/email'
import type { LeagueAdmin } from '@/lib/types'

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

  // Seed owner row in league_admins
  await supabase.from('league_admins').insert({
    league_id: league.id,
    email: formData.admin_email,
    role: 'owner',
    accepted_at: new Date().toISOString(),
  })

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const superAdmin = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''
  if (user.email !== superAdmin) {
    const { data: adminRow } = await supabase
      .from('league_admins')
      .select('role')
      .eq('league_id', id)
      .eq('email', user.email!)
      .single()
    if (adminRow?.role !== 'owner') throw new Error('Only the league owner can delete this league')
  }

  const { error } = await supabase
    .from('leagues')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/leagues')
}

export async function getLeagueAdmins(leagueId: string): Promise<LeagueAdmin[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('league_admins')
    .select('*')
    .eq('league_id', leagueId)
    .order('invited_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function inviteLeagueAdmin(leagueId: string, email: string, invitedByEmail: string) {
  const supabase = await createClient()

  // Upsert — re-inviting an existing pending invite just refreshes invited_at
  const { error } = await supabase
    .from('league_admins')
    .upsert(
      { league_id: leagueId, email, role: 'admin', invited_by: invitedByEmail, accepted_at: null },
      { onConflict: 'league_id,email', ignoreDuplicates: false }
    )
  if (error) throw new Error(error.message)

  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', leagueId)
    .single()

  await sendLeagueAdminInviteEmail({
    to: email,
    leagueName: league?.name ?? 'your league',
    invitedByEmail,
  })

  revalidatePath('/dashboard/leagues')
}

export async function removeLeagueAdmin(leagueId: string, adminId: string) {
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('league_admins')
    .select('role')
    .eq('id', adminId)
    .single()

  if (row?.role === 'owner') throw new Error('Cannot remove the league owner')

  const { error } = await supabase
    .from('league_admins')
    .delete()
    .eq('id', adminId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/leagues')
}
