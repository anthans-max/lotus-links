import React from 'react'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { checkLeagueAccess } from '@/lib/auth'
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
  const { user, hasAccess } = await checkLeagueAccess(leagueId)
  if (user && !hasAccess) redirect('/dashboard/leagues')
  const isAdmin = !!user && hasAccess
  if (!isAdmin) redirect(`/leaderboard/${id}`)

  const supabase = await createClient()
  const [{ data: league }, { data: tournament }, { data: holes }, { data: groups }, { data: scores }] = await Promise.all([
    supabase.from('leagues').select('id, name, primary_color, logo_url').eq('id', leagueId).single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('holes').select('hole_number, par').eq('tournament_id', id).order('hole_number'),
    supabase.from('groups').select('id, name, chaperone_name, current_hole, status, pin').eq('tournament_id', id).order('name'),
    supabase.from('scores').select('*').eq('tournament_id', id).order('hole_number'),
  ])

  if (!league || !tournament) notFound()

  const accentColor = (league as any).primary_color || '#1a5c2a'
  const logoUrl = (league as any).logo_url as string | null | undefined

  return (
    <div className="section fade-up" style={{ '--league-accent': accentColor } as React.CSSProperties}>
      <PageHeader
        title="Scores"
        backHref={`/dashboard/leagues/${leagueId}/tournaments/${id}`}
        backLabel={tournament.name}
        logoUrl={logoUrl}
        leagueName={(league as any).name}
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
