'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Chaperone } from '@/lib/types'
import { sendScoringLinkEmail } from '@/lib/email'
import { getBaseUrl } from '@/lib/url'

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
  data: { name: string; email?: string; phone?: string; role?: 'parent' | 'coach' | 'volunteer'; group_id?: string }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('chaperones').insert({
    tournament_id: tournamentId,
    name: data.name.trim(),
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    role: data.role ?? 'parent',
    group_id: data.group_id ?? null,
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
  // Upsert on the composite PK — silently ignores if already assigned
  const { error } = await supabase
    .from('group_chaperones')
    .upsert({ group_id: groupId, chaperone_id: chaperoneId }, { onConflict: 'group_id, chaperone_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function removeChaperoneFromGroup(groupId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('group_chaperones').delete().eq('group_id', groupId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function removeChaperoneFromGroupById(groupId: string, chaperoneId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('group_chaperones')
    .delete()
    .eq('group_id', groupId)
    .eq('chaperone_id', chaperoneId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

// ─── Scoring tokens ───────────────────────────────────────────────────────────

// ─── Send scoring link emails to all chaperones for a group ──────────────────

/**
 * Sends scoring-link emails to all chaperones assigned to a group
 * (both inline chaperones with group_id set and the formally assigned one
 * via group_chaperones). Updates token_sent_at on each chaperone row.
 */
export async function sendGroupChaperoneEmails(
  groupId: string
): Promise<{ sent: number; failed: number }> {
  const supabase = await createClient()

  // Fetch group info
  const { data: group } = await supabase
    .from('groups')
    .select('*, group_players(player_id)')
    .eq('id', groupId)
    .single()
  if (!group) throw new Error('Group not found')

  // Fetch tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, course, date')
    .eq('id', group.tournament_id)
    .single()
  if (!tournament) throw new Error('Tournament not found')

  // Fetch player names
  const playerIds = (group.group_players as { player_id: string }[]).map(gp => gp.player_id)
  const { data: players } = playerIds.length > 0
    ? await supabase.from('players').select('name').in('id', playerIds)
    : { data: [] as { name: string }[] }
  const playerNames = (players ?? []).map(p => p.name)

  // Get/create scoring token
  const { data: existingToken } = await supabase
    .from('group_scoring_tokens')
    .select('token')
    .eq('group_id', groupId)
    .eq('tournament_id', group.tournament_id)
    .single()

  let token: string
  if (existingToken?.token) {
    token = existingToken.token
  } else {
    const { data: newToken, error: tokenErr } = await supabase
      .from('group_scoring_tokens')
      .insert({ group_id: groupId, tournament_id: group.tournament_id })
      .select('token')
      .single()
    if (tokenErr || !newToken) throw new Error('Failed to create scoring token')
    token = newToken.token
  }

  // Collect all chaperones for this group with an email
  const { data: inlineChaps } = await supabase
    .from('chaperones')
    .select('id, name, email')
    .eq('group_id', groupId)
    .not('email', 'is', null)

  // Also include formally assigned chaperone (group_chaperones one-to-one)
  const { data: gc } = await supabase
    .from('group_chaperones')
    .select('chaperones(id, name, email)')
    .eq('group_id', groupId)
    .single()
  const formalChap = (gc?.chaperones as unknown) as { id: string; name: string; email: string | null } | null

  const allChaps: { id: string; name: string; email: string }[] = [
    ...(inlineChaps ?? []).filter((c): c is { id: string; name: string; email: string } => !!c.email),
  ]
  if (formalChap?.email && !allChaps.some(c => c.id === formalChap.id)) {
    allChaps.push({ id: formalChap.id, name: formalChap.name, email: formalChap.email })
  }

  if (allChaps.length === 0) throw new Error('No chaperones with email for this group')

  const scoringUrl = `${getBaseUrl()}/score/t/${token}`
  const now = new Date().toISOString()
  let sent = 0
  let failed = 0

  for (const chap of allChaps) {
    try {
      await sendScoringLinkEmail({
        to: chap.email,
        groupName: group.name,
        chaperoneName: chap.name,
        players: playerNames,
        startingHole: group.starting_hole ?? 1,
        scoringUrl,
        tournamentName: tournament.name,
        courseName: tournament.course,
        tournamentDate: tournament.date,
      })
      // Mark email as sent
      await supabase
        .from('chaperones')
        .update({ token_sent_at: now })
        .eq('id', chap.id)
      sent++
    } catch {
      failed++
    }
  }

  revalidatePath('/dashboard')
  return { sent, failed }
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
