import React from 'react'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { checkLeagueAccess } from '@/lib/auth'
import PageHeader from '@/components/ui/PageHeader'
import TournamentTabs from '@/components/admin/TournamentTabs'
import HoleConfigForm from '@/components/admin/HoleConfigForm'

export const metadata: Metadata = {
  title: 'Hole Configuration',
}

interface Props {
  params: Promise<{ leagueId: string; id: string }>
}

export default async function HolesPage({ params }: Props) {
  const { leagueId, id } = await params
  const { user, hasAccess } = await checkLeagueAccess(leagueId)
  if (!user) redirect('/login')
  if (!hasAccess) redirect('/dashboard/leagues')

  const supabase = await createClient()
  const [{ data: league }, { data: tournament }, { data: holes }] = await Promise.all([
    supabase.from('leagues').select('id, name, primary_color, logo_url').eq('id', leagueId).single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('holes').select('*').eq('tournament_id', id).order('hole_number'),
  ])

  if (!league || !tournament) notFound()

  const accentColor = (league as any).primary_color || '#1a5c2a'
  const logoUrl = (league as any).logo_url as string | null | undefined

  return (
    <div className="section fade-up" style={{ '--league-accent': accentColor } as React.CSSProperties}>
      <PageHeader
        title="Hole Configuration"
        backHref={`/dashboard/leagues/${leagueId}/tournaments/${id}`}
        backLabel={tournament.name}
        logoUrl={logoUrl}
        leagueName={(league as any).name}
      />
      <TournamentTabs leagueId={leagueId} tournamentId={id} />
      <HoleConfigForm
        tournamentId={id}
        leagueId={leagueId}
        holeCount={tournament.holes}
        existingHoles={holes ?? []}
      />
    </div>
  )
}
