import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import CreateTournamentForm from '@/components/admin/CreateTournamentForm'

export const metadata: Metadata = {
  title: 'Create Tournament',
}

interface Props {
  params: Promise<{ leagueId: string }>
}

export default async function NewTournamentPage({ params }: Props) {
  const { leagueId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('id', leagueId)
    .single()

  if (!league) notFound()

  return (
    <div className="section fade-up">
      <PageHeader
        title="Create Tournament"
        backHref={`/dashboard/leagues/${leagueId}`}
        backLabel={league.name}
      />
      <CreateTournamentForm leagueId={leagueId} />
    </div>
  )
}
