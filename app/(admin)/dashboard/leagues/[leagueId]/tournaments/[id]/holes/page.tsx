import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import HoleConfigForm from '@/components/admin/HoleConfigForm'

export const metadata: Metadata = {
  title: 'Hole Configuration',
}

interface Props {
  params: Promise<{ leagueId: string; id: string }>
}

export default async function HolesPage({ params }: Props) {
  const { leagueId, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: league }, { data: tournament }, { data: holes }] = await Promise.all([
    supabase.from('leagues').select('id, name').eq('id', leagueId).single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('holes').select('*').eq('tournament_id', id).order('hole_number'),
  ])

  if (!league || !tournament) notFound()

  return (
    <div className="section fade-up">
      <PageHeader
        title="Hole Configuration"
        backHref={`/dashboard/leagues/${leagueId}/tournaments/${id}`}
        backLabel={tournament.name}
      />
      <HoleConfigForm
        tournamentId={id}
        leagueId={leagueId}
        holeCount={tournament.holes}
        existingHoles={holes ?? []}
      />
    </div>
  )
}
