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

export async function toggleLeaderboardPublic(tournamentId: string, isPublic: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tournaments')
    .update({ leaderboard_public: isPublic })
    .eq('id', tournamentId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
