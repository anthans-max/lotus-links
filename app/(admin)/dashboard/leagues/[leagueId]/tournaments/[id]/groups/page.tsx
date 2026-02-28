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
  if (user && !hasAccess) redirect('/dashboard/leagues')
  const isAdmin = !!user && hasAccess

  const supabase = await createClient()
  const [{ data: league }, { data: tournament }, { data: players }, { data: groups }, { data: pairingPrefs }] = await Promise.all([
    supabase.from('leagues').select('id, name, primary_color, logo_url, league_type').eq('id', leagueId).single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('players').select('*').eq('tournament_id', id).order('name'),
    supabase.from('groups').select('*, group_players(*)').eq('tournament_id', id).order('created_at'),
    supabase.from('pairing_preferences').select('*').eq('tournament_id', id),
  ])

  if (!league || !tournament) notFound()

  const accentColor = (league as any).primary_color || '#1a5c2a'
  const logoUrl = (league as any).logo_url as string | null | undefined
  const isWish = (league as any).league_type === 'wish'

  // Build player name map for read-only view
  const playerMap = new Map((players ?? []).map(p => [(p as any).id, (p as any).name]))

  return (
    <div className="section fade-up" style={{ '--league-accent': accentColor } as React.CSSProperties}>
      <PageHeader
        title="Groups"
        backHref={`/dashboard/leagues/${leagueId}/tournaments/${id}`}
        backLabel={tournament.name}
        logoUrl={logoUrl}
        leagueName={(league as any).name}
      />
      <TournamentTabs leagueId={leagueId} tournamentId={id} />
      {isAdmin ? (
        <GroupsManager
          tournamentId={id}
          leagueId={leagueId}
          tournament={tournament}
          players={players ?? []}
          groups={(groups ?? []) as any}
          pairingPrefs={pairingPrefs ?? []}
          isWish={isWish}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {groups?.length ?? 0} group{(groups?.length ?? 0) !== 1 ? 's' : ''}
          </div>
          {(groups ?? []).map(g => {
            const memberIds = ((g as any).group_players as { player_id: string }[]).map(gp => gp.player_id)
            const memberNames = memberIds.map(pid => playerMap.get(pid) ?? 'Unknown')
            const chaperonLabel = isWish ? 'Chaperone' : 'Scorer'
            return (
              <div key={g.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', color: 'var(--gold)', marginBottom: '0.25rem' }}>{g.name}</div>
                {g.chaperone_name && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{chaperonLabel}: {g.chaperone_name}</div>
                )}
                {memberNames.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                    {memberNames.map((name, i) => (
                      <span key={i} style={{ fontSize: '0.78rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.2rem 0.5rem', color: 'var(--text-muted)' }}>{name}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
