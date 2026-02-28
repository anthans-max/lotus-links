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
  if (user && !hasAccess) redirect('/dashboard/leagues')
  const isAdmin = !!user && hasAccess

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
        title="Holes"
        backHref={`/dashboard/leagues/${leagueId}/tournaments/${id}`}
        backLabel={tournament.name}
        logoUrl={logoUrl}
        leagueName={(league as any).name}
      />
      <TournamentTabs leagueId={leagueId} tournamentId={id} />
      {isAdmin ? (
        <HoleConfigForm
          tournamentId={id}
          leagueId={leagueId}
          holeCount={tournament.holes}
          existingHoles={holes ?? []}
        />
      ) : (
        <div className="card" style={{ padding: '1.25rem', overflowX: 'auto' }}>
          <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Course — {tournament.holes} holes
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border2)' }}>
                {['Hole', 'Par', 'Yardage', 'SI'].map(h => (
                  <th key={h} style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontFamily: 'var(--fm)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(holes ?? []).map(h => (
                <tr key={h.hole_number} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'var(--fm)', color: 'var(--gold)' }}>{h.hole_number}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{h.par}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{h.yardage ?? '—'}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{h.handicap ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
