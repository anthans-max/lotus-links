import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import LeagueTournaments from '@/components/admin/LeagueTournaments'

export const metadata: Metadata = {
  title: 'League',
}

interface Props {
  params: Promise<{ leagueId: string }>
}

export default async function LeagueDetailPage({ params }: Props) {
  const { leagueId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single()

  if (!league) notFound()

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .eq('league_id', leagueId)
    .order('date', { ascending: false })

  return (
    <div className="section fade-up">
      <PageHeader
        title={league.name}
        backHref="/dashboard/leagues"
        backLabel="Leagues"
        action={
          <Link href={`/dashboard/leagues/${leagueId}/tournaments/new`} className="btn btn-gold btn-sm">
            + New Tournament
          </Link>
        }
      />

      {/* League info bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '0.875rem 1.25rem',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: league.primary_color || 'var(--green)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <span className="section-tag">{league.admin_email}</span>
        </div>
        <span className="badge badge-gray">
          {(tournaments ?? []).length} tournament{(tournaments ?? []).length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tournaments */}
      <div style={{ marginBottom: '0.75rem' }}>
        <span className="section-tag">Tournaments</span>
      </div>

      {(!tournaments || tournaments.length === 0) ? (
        <EmptyState
          icon="🏌️"
          title="No Tournaments Yet"
          description="Create your first tournament to get started."
          action={
            <Link href={`/dashboard/leagues/${leagueId}/tournaments/new`} className="btn btn-gold">
              Create Tournament
            </Link>
          }
        />
      ) : (
        <LeagueTournaments
          tournaments={tournaments as any[]}
          leagueId={leagueId}
        />
      )}
    </div>
  )
}
