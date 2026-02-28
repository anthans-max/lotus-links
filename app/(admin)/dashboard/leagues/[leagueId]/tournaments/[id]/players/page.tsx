import React from 'react'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { checkLeagueAccess } from '@/lib/auth'
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
  const { user, hasAccess } = await checkLeagueAccess(leagueId)
  if (user && !hasAccess) redirect('/dashboard/leagues')
  const isAdmin = !!user && hasAccess

  const supabase = await createClient()
  const [{ data: league }, { data: tournament }, { data: players }] = await Promise.all([
    supabase.from('leagues').select('id, name, primary_color, logo_url, league_type').eq('id', leagueId).single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('players').select('*').eq('tournament_id', id).order('name'),
  ])

  if (!league || !tournament) notFound()

  const accentColor = (league as any).primary_color || '#1a5c2a'
  const logoUrl = (league as any).logo_url as string | null | undefined
  const isWish = (league as any).league_type === 'wish'

  // Admin: fetch pairing prefs
  const { data: pairingPrefs } = isAdmin
    ? await supabase.from('pairing_preferences').select('player_id, preferred_player_id').eq('tournament_id', id)
    : { data: [] as { player_id: string; preferred_player_id: string }[] }

  const statusBadge = (status: string) => {
    if (status === 'checked_in') return 'badge-green'
    if (status === 'registered') return 'badge-blue'
    return 'badge-gray'
  }

  return (
    <div className="section fade-up" style={{ '--league-accent': accentColor } as React.CSSProperties}>
      <PageHeader
        title="Players"
        backHref={`/dashboard/leagues/${leagueId}/tournaments/${id}`}
        backLabel={tournament.name}
        logoUrl={logoUrl}
        leagueName={(league as any).name}
      />
      <TournamentTabs leagueId={leagueId} tournamentId={id} />
      {isAdmin ? (
        <PlayersManager
          tournamentId={id}
          leagueId={leagueId}
          players={players ?? []}
          pairingPrefs={pairingPrefs ?? []}
          isWish={isWish}
        />
      ) : (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {players?.length ?? 0} player{(players?.length ?? 0) !== 1 ? 's' : ''} registered
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {(players ?? []).map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: i < (players?.length ?? 1) - 1 ? '1px solid var(--border)' : 'none', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem' }}>{(p as any).name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  {isWish && (p as any).grade && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grade {(p as any).grade}</span>
                  )}
                  <span className={`badge ${statusBadge((p as any).status)}`} style={{ fontSize: '0.6rem' }}>
                    {(p as any).status === 'checked_in' ? 'Checked In' : (p as any).status === 'registered' ? 'Registered' : 'Pre-Reg'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
