import React from 'react'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { checkLeagueAccess } from '@/lib/auth'
import PageHeader from '@/components/ui/PageHeader'
import TournamentTabs from '@/components/admin/TournamentTabs'
import TournamentInfoCard from '@/components/admin/TournamentInfoCard'
import CopyTokenButton from '@/components/admin/CopyTokenButton'
import ChatAssistant from '@/components/chat/ChatAssistant'

export const metadata: Metadata = {
  title: 'Tournament',
}

interface Props {
  params: Promise<{ leagueId: string; id: string }>
}

export default async function TournamentDetailPage({ params }: Props) {
  const { leagueId, id } = await params
  const { user, hasAccess } = await checkLeagueAccess(leagueId)
  const isAdmin = !!user && hasAccess

  const supabase = await createClient()
  const [{ data: league }, { data: tournament }] = await Promise.all([
    supabase.from('leagues').select('id, name, primary_color, logo_url').eq('id', leagueId).single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
  ])

  if (!league || !tournament) notFound()

  // Fetch counts in parallel
  const [
    { count: holeCount },
    { count: playerCount },
    { count: groupCount },
    { count: registeredCount },
    { count: scoreCount },
    { count: completedGroupCount },
  ] = await Promise.all([
    supabase.from('holes').select('*', { count: 'exact', head: true }).eq('tournament_id', id),
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('tournament_id', id),
    supabase.from('groups').select('*', { count: 'exact', head: true }).eq('tournament_id', id),
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('tournament_id', id).in('status', ['registered', 'checked_in']),
    supabase.from('scores').select('*', { count: 'exact', head: true }).eq('tournament_id', id),
    supabase.from('groups').select('*', { count: 'exact', head: true }).eq('tournament_id', id).eq('status', 'completed'),
  ])

  const totalPar = holeCount && holeCount > 0
    ? (await supabase.from('holes').select('par').eq('tournament_id', id)).data?.reduce((sum, h) => sum + h.par, 0) ?? 0
    : 0

  const accentColor = (league as any).primary_color || '#1a5c2a'
  const logoUrl = (league as any).logo_url as string | null | undefined

  return (
    <div className="section fade-up" style={{ '--league-accent': accentColor } as React.CSSProperties}>
      <PageHeader
        title={tournament.name}
        backHref={isAdmin ? `/dashboard/leagues/${leagueId}` : undefined}
        backLabel={isAdmin ? league.name : undefined}
        logoUrl={logoUrl}
        leagueName={league.name}
      />

      <TournamentInfoCard tournament={tournament as any} leagueId={leagueId} isAdmin={isAdmin} />

      <TournamentTabs leagueId={leagueId} tournamentId={id} />

      {/* Navigation cards */}
      <div className="g4" style={{ alignItems: 'stretch' }}>
        <NavCard
          href={`/dashboard/leagues/${leagueId}/tournaments/${id}/holes`}
          title="Holes"
          stat={holeCount ?? 0}
          statLabel={`hole${(holeCount ?? 0) !== 1 ? 's' : ''} configured`}
          subStat={totalPar > 0 ? `Par ${totalPar}` : undefined}
          icon="⛳"
        />
        <NavCard
          href={`/dashboard/leagues/${leagueId}/tournaments/${id}/players`}
          title="Players"
          stat={playerCount ?? 0}
          statLabel={`player${(playerCount ?? 0) !== 1 ? 's' : ''}`}
          subStat={registeredCount ? `${registeredCount} registered` : undefined}
          icon="👤"
        />
        <NavCard
          href={`/dashboard/leagues/${leagueId}/tournaments/${id}/groups`}
          title="Groups"
          stat={groupCount ?? 0}
          statLabel={`group${(groupCount ?? 0) !== 1 ? 's' : ''}`}
          icon="👥"
        />
        <NavCard
          href={`/dashboard/leagues/${leagueId}/tournaments/${id}/scores`}
          title="Scores"
          stat={scoreCount ?? 0}
          statLabel={`score${(scoreCount ?? 0) !== 1 ? 's' : ''} entered`}
          subStat={(completedGroupCount ?? 0) > 0 ? `${completedGroupCount} groups finished` : undefined}
          icon="📊"
        />
      </div>

      <ChatAssistant tournamentId={id} />

      {/* Leaderboard quick-access */}
      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <a
          href={`/leaderboard/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            textDecoration: 'none',
            color: 'var(--text)',
            transition: 'border-color 0.2s',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '1.5rem' }}>🏆</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.15rem' }}>
              Public Leaderboard
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
              {tournament.leaderboard_public
                ? 'Live — visible to spectators'
                : 'Not live — activate from the Scores tab'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {tournament.leaderboard_public ? (
              <span className="badge badge-green" style={{ fontSize: '0.58rem' }}>Live</span>
            ) : (
              <span className="badge badge-gray" style={{ fontSize: '0.58rem' }}>Hidden</span>
            )}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>↗</span>
          </div>
        </a>

        {/* Scoring link for token-based access */}
        {tournament.public_token && (
          <div
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>🔗</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.15rem' }}>
                Player Scoring Link
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                Share with players — opens score entry at{' '}
                <span style={{ color: 'var(--text-dim)' }}>/t/{tournament.public_token}</span>
              </div>
            </div>
            <CopyTokenButton token={tournament.public_token} />
          </div>
        )}
      </div>
    </div>
  )
}

function NavCard({
  href,
  title,
  stat,
  statLabel,
  subStat,
  icon,
  disabled,
  disabledLabel,
}: {
  href: string
  title: string
  stat: number
  statLabel: string
  subStat?: string
  icon: string
  disabled?: boolean
  disabledLabel?: string
}) {
  const content = (
    <div
      className="card"
      style={{
        textAlign: 'center',
        padding: '1.5rem 1rem',
        transition: 'border-color 0.2s',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ fontFamily: 'var(--fm)', fontSize: '1.5rem', color: 'var(--gold)', marginBottom: '0.15rem' }}>{stat}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>{statLabel}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontFamily: 'var(--fm)', marginTop: '0.25rem', visibility: subStat ? 'visible' : 'hidden' }}>
        {subStat || '\u00A0'}
      </div>
      {disabled && disabledLabel && (
        <span className="badge badge-gray" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.6rem' }}>
          {disabledLabel}
        </span>
      )}
    </div>
  )

  if (disabled) return content
  return <Link href={href} style={{ display: 'block', height: '100%' }}>{content}</Link>
}
