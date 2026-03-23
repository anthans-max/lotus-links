'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function upsertScore(data: {
  tournamentId: string
  groupId: string
  holeNumber: number
  strokes: number
  enteredBy?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('scores')
    .upsert(
      {
        tournament_id: data.tournamentId,
        group_id: data.groupId,
        hole_number: data.holeNumber,
        strokes: data.strokes,
        entered_by: data.enteredBy ?? null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'group_id,tournament_id,hole_number' }
    )

  if (error) throw new Error(error.message)
}

export async function updateGroupProgress(
  groupId: string,
  currentHole: number,
  status: 'not_started' | 'in_progress' | 'completed'
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('groups')
    .update({ current_hole: currentHole, status })
    .eq('id', groupId)

  if (error) throw new Error(error.message)
}

export async function submitScorecard(data: {
  tournamentId: string
  groupId: string
  scores: { holeNumber: number; strokes: number }[]
  enteredBy?: string
}) {
  const supabase = await createClient()

  // Upsert all scores
  const rows = data.scores.map(s => ({
    tournament_id: data.tournamentId,
    group_id: data.groupId,
    hole_number: s.holeNumber,
    strokes: s.strokes,
    entered_by: data.enteredBy ?? null,
    submitted_at: new Date().toISOString(),
  }))

  const { error: scoreError } = await supabase
    .from('scores')
    .upsert(rows, { onConflict: 'group_id,tournament_id,hole_number' })

  if (scoreError) throw new Error(scoreError.message)

  // Mark group as completed
  const { error: groupError } = await supabase
    .from('groups')
    .update({ status: 'completed', current_hole: data.scores.length })
    .eq('id', data.groupId)

  if (groupError) throw new Error(groupError.message)
}

export async function deleteScore(
  groupId: string,
  tournamentId: string,
  holeNumber: number
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('scores')
    .delete()
    .eq('group_id', groupId)
    .eq('tournament_id', tournamentId)
    .eq('hole_number', holeNumber)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function adminUpdateScore(data: {
  tournamentId: string
  groupId: string
  holeNumber: number
  strokes: number
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('scores')
    .upsert(
      {
        tournament_id: data.tournamentId,
        group_id: data.groupId,
        hole_number: data.holeNumber,
        strokes: data.strokes,
        entered_by: 'admin',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'group_id,tournament_id,hole_number' }
    )

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}

export async function resetTournamentScores(tournamentId: string): Promise<{ deleted: number }> {
  const supabase = await createClient()

  // Verify super admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const superAdmin = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''
  if (user.email !== superAdmin) throw new Error('Super admin access required')

  // Count scores before deleting
  const { count } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)

  // Delete all scores for this tournament
  const { error: scoreErr } = await supabase
    .from('scores')
    .delete()
    .eq('tournament_id', tournamentId)

  if (scoreErr) throw new Error(scoreErr.message)

  // Reset all groups to not_started, current_hole back to 1
  const { error: groupErr } = await supabase
    .from('groups')
    .update({ status: 'not_started', current_hole: 1 })
    .eq('tournament_id', tournamentId)

  if (groupErr) throw new Error(groupErr.message)

  revalidatePath('/dashboard')
  return { deleted: count ?? 0 }
}

export async function toggleLeaderboardPublic(tournamentId: string, isPublic: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tournaments')
    .update({ leaderboard_public: isPublic })
    .eq('id', tournamentId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
