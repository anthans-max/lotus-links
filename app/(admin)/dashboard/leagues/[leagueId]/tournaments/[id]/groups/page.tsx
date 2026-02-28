import React from 'react'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { checkLeagueAccess } from '@/lib/auth'
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
  const { user, hasAccess } = await checkLeagueAccess(leagueId)
  if (!user) redirect('/login')
  if (!hasAccess) redirect('/dashboard/leagues')

  const supabase = await createClient()
  const [{ data: league }, { data: tournament }, { data: players }, { data: groups }, { data: pairingPrefs }] = await Promise.all([
    supabase.from('leagues').select('id, name, primary_color, league_type').eq('id', leagueId).single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('players').select('*').eq('tournament_id', id).order('name'),
    supabase.from('groups').select('*, group_players(*)').eq('tournament_id', id).order('created_at'),
    supabase.from('pairing_preferences').select('*').eq('tournament_id', id),
  ])

  if (!league || !tournament) notFound()

  const accentColor = (league as any).primary_color || '#1a5c2a'
  const isWish = (league as any).league_type === 'wish'

  return (
    <div className="section fade-up" style={{ '--league-accent': accentColor } as React.CSSProperties}>
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
        isWish={isWish}
      />
    </div>
  )
}
