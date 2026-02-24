import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import TournamentTabs from '@/components/admin/TournamentTabs'
import PlayersManager from '@/components/admin/PlayersManager'

export const metadata: Metadata = {
  title: 'Players',
}

interface Props {
  params: Promise<{ leagueId: string; id: string }>
}

export default async function PlayersPage({ params }: Props) {
  const { leagueId, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: league }, { data: tournament }, { data: players }] = await Promise.all([
    supabase.from('leagues').select('id, name').eq('id', leagueId).single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('players').select('*').eq('tournament_id', id).order('name'),
  ])

  if (!league || !tournament) notFound()

  // Get pairing preferences for these players
  const { data: pairingPrefs } = await supabase
    .from('pairing_preferences')
    .select('player_id, preferred_player_id')
    .eq('tournament_id', id)

  return (
    <div className="section fade-up">
      <PageHeader
        title="Players"
        backHref={`/dashboard/leagues/${leagueId}/tournaments/${id}`}
        backLabel={tournament.name}
      />
      <TournamentTabs leagueId={leagueId} tournamentId={id} />
      <PlayersManager
        tournamentId={id}
        leagueId={leagueId}
        players={players ?? []}
        pairingPrefs={pairingPrefs ?? []}
      />
    </div>
  )
}
