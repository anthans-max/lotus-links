import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'Tournament',
}

interface Props {
  params: Promise<{ leagueId: string; id: string }>
}

export default async function TournamentDetailPage({ params }: Props) {
  const { leagueId, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: league }, { data: tournament }] = await Promise.all([
    supabase.from('leagues').select('id, name').eq('id', leagueId).single(),
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

  return (
    <div className="section fade-up">
      <PageHeader
        title={tournament.name}
        backHref={`/dashboard/leagues/${leagueId}`}
        backLabel={league.name}
      />

      {/* Tournament info */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          <Badge status={tournament.status}>{tournament.status}</Badge>
          <InfoItem label="Date" value={new Date(tournament.date).toLocaleDateString()} />
          <InfoItem label="Course" value={tournament.course} />
          <InfoItem label="Format" value={tournament.format} />
          <InfoItem label="Holes" value={`${tournament.holes}`} />
          {tournament.shotgun_start && (
            <span className="badge badge-gold">Shotgun</span>
          )}
        </div>
        {tournament.notes && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            {tournament.notes}
          </p>
        )}
      </Card>

      {/* Navigation cards */}
      <div className="g2" style={{ alignItems: 'stretch' }}>
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
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div style={{ fontSize: '0.95rem' }}>{value}</div>
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
