import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Tournament, Hole, Player, Group, GroupPlayer, Score } from '@/lib/types'
import DashboardShell from '@/components/admin/DashboardShell'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch the first tournament (MVP: one tournament at a time)
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  const tournament: Tournament | null =
    (tournaments as Tournament[] | null)?.[0] ?? null

  // Parallel fetch remaining data (only if tournament exists)
  let holes: Hole[] = []
  let players: Player[] = []
  let groups: (Group & { group_players: GroupPlayer[] })[] = []
  let scores: Score[] = []

  if (tournament) {
    const [holesRes, playersRes, groupsRes, scoresRes] = await Promise.all([
      supabase
        .from('holes')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('hole_number'),
      supabase
        .from('players')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('name'),
      supabase
        .from('groups')
        .select('*, group_players(*)')
        .eq('tournament_id', tournament.id)
        .order('created_at'),
      supabase
        .from('scores')
        .select('*')
        .eq('tournament_id', tournament.id),
    ])

    holes = (holesRes.data ?? []) as Hole[]
    players = (playersRes.data ?? []) as Player[]
    groups = (groupsRes.data ?? []) as (Group & { group_players: GroupPlayer[] })[]
    scores = (scoresRes.data ?? []) as Score[]
  }

  return (
    <DashboardShell
      data={{ tournament, holes, players, groups, scores }}
    />
  )
}
