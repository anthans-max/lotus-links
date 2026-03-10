'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Chaperone } from '@/lib/types'

// ─── Chaperone CRUD ───────────────────────────────────────────────────────────

export async function getChaperones(tournamentId: string): Promise<Chaperone[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chaperones')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as Chaperone[]
}

export async function createChaperone(
  tournamentId: string,
  data: { name: string; email?: string; phone?: string; role?: 'parent' | 'coach' | 'volunteer' }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('chaperones').insert({
    tournament_id: tournamentId,
    name: data.name.trim(),
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    role: data.role ?? 'parent',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function updateChaperone(
  id: string,
  data: { name?: string; email?: string | null; phone?: string | null; role?: 'parent' | 'coach' | 'volunteer' }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chaperones')
    .update({
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.email !== undefined && { email: data.email?.trim() || null }),
      ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
      ...(data.role !== undefined && { role: data.role }),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function deleteChaperone(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('chaperones').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

// ─── Group ↔ Chaperone assignment ─────────────────────────────────────────────

export async function assignChaperoneToGroup(groupId: string, chaperoneId: string) {
  const supabase = await createClient()
  // Upsert so re-assigning replaces the old one
  const { error } = await supabase
    .from('group_chaperones')
    .upsert({ group_id: groupId, chaperone_id: chaperoneId }, { onConflict: 'group_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function removeChaperoneFromGroup(groupId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('group_chaperones').delete().eq('group_id', groupId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

// ─── Scoring tokens ───────────────────────────────────────────────────────────

/**
 * Gets an existing token for this group or creates a new one.
 * Returns the token UUID string.
 */
export async function getOrCreateGroupToken(groupId: string, tournamentId: string): Promise<string> {
  const supabase = await createClient()

  // Try to get existing token
  const { data: existing } = await supabase
    .from('group_scoring_tokens')
    .select('token')
    .eq('group_id', groupId)
    .eq('tournament_id', tournamentId)
    .single()

  if (existing?.token) return existing.token

  // Create new token
  const { data: created, error } = await supabase
    .from('group_scoring_tokens')
    .insert({ group_id: groupId, tournament_id: tournamentId })
    .select('token')
    .single()

  if (error) throw new Error(error.message)
  return created!.token
}
