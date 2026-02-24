import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import TournamentTabs from '@/components/admin/TournamentTabs'
import ScoresMonitor from '@/components/admin/ScoresMonitor'

export const metadata: Metadata = {
  title: 'Scores',
}

interface Props {
  params: Promise<{ leagueId: string; id: string }>
}

export default async function ScoresPage({ params }: Props) {
  const { leagueId, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: league }, { data: tournament }, { data: holes }, { data: groups }, { data: scores }] = await Promise.all([
    supabase.from('leagues').select('id, name').eq('id', leagueId).single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('holes').select('hole_number, par').eq('tournament_id', id).order('hole_number'),
    supabase.from('groups').select('id, name, chaperone_name, current_hole, status, pin').eq('tournament_id', id).order('name'),
    supabase.from('scores').select('*').eq('tournament_id', id).order('hole_number'),
  ])

  if (!league || !tournament) notFound()

  return (
    <div className="section fade-up">
      <PageHeader
        title="Scores"
        backHref={`/dashboard/leagues/${leagueId}/tournaments/${id}`}
        backLabel={tournament.name}
      />
      <TournamentTabs leagueId={leagueId} tournamentId={id} />
      <ScoresMonitor
        tournamentId={id}
        leagueId={leagueId}
        tournament={{
          name: tournament.name,
          holeCount: tournament.holes,
          leaderboardPublic: tournament.leaderboard_public,
        }}
        holes={(holes ?? []).map(h => ({ number: h.hole_number, par: h.par }))}
        groups={(groups ?? []).map(g => ({
          id: g.id,
          name: g.name,
          chaperoneName: g.chaperone_name,
          currentHole: g.current_hole ?? 1,
          status: g.status,
          pin: g.pin,
        }))}
        scores={(scores ?? []).map(s => ({
          id: s.id,
          groupId: s.group_id,
          holeNumber: s.hole_number,
          strokes: s.strokes,
          enteredBy: s.entered_by,
          submittedAt: s.submitted_at,
        }))}
      />
    </div>
  )
}
