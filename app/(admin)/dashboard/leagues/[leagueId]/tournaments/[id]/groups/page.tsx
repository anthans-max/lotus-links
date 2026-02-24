import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import TournamentTabs from '@/components/admin/TournamentTabs'
import GroupsManager from '@/components/admin/GroupsManager'

export const metadata: Metadata = {
  title: 'Groups',
}

interface Props {
  params: Promise<{ leagueId: string; id: string }>
}

export default async function GroupsPage({ params }: Props) {
  const { leagueId, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: league }, { data: tournament }, { data: players }, { data: groups }, { data: pairingPrefs }] = await Promise.all([
    supabase.from('leagues').select('id, name').eq('id', leagueId).single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('players').select('*').eq('tournament_id', id).order('name'),
    supabase.from('groups').select('*, group_players(*)').eq('tournament_id', id).order('created_at'),
    supabase.from('pairing_preferences').select('*').eq('tournament_id', id),
  ])

  if (!league || !tournament) notFound()

  return (
    <div className="section fade-up">
      <PageHeader
        title="Groups"
        backHref={`/dashboard/leagues/${leagueId}/tournaments/${id}`}
        backLabel={tournament.name}
      />
      <TournamentTabs leagueId={leagueId} tournamentId={id} />
      <GroupsManager
        tournamentId={id}
        leagueId={leagueId}
        tournament={tournament}
        players={players ?? []}
        groups={(groups ?? []) as any}
        pairingPrefs={pairingPrefs ?? []}
      />
    </div>
  )
}
