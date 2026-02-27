import React from 'react'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import LeagueTournaments from '@/components/admin/LeagueTournaments'
import LeagueDetailHeader from '@/components/admin/LeagueDetailHeader'

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

  // Access control: check league ownership
  const superAdmin = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single()

  if (!league) notFound()

  // If not super admin and not league owner, redirect
  if (user.email !== superAdmin && league.admin_email !== user.email) {
    redirect('/dashboard/leagues')
  }

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .eq('league_id', leagueId)
    .order('date', { ascending: false })

  const accentColor = league.primary_color || '#1a5c2a'

  return (
    <div className="section fade-up" style={{ '--league-accent': accentColor } as React.CSSProperties}>
      <PageHeader
        title={league.name}
        backHref="/dashboard/leagues"
        backLabel="Leagues"
        action={
          <Link href={`/dashboard/leagues/${leagueId}/tournaments/new`} className="btn btn-accent btn-sm">
            + New Tournament
          </Link>
        }
      />

      <LeagueDetailHeader league={league as any} />

      {/* Tournaments */}
      <div style={{ marginBottom: '0.75rem' }}>
        <span className="section-tag">Tournaments</span>
        <span className="badge badge-gray" style={{ marginLeft: '0.5rem' }}>
          {(tournaments ?? []).length}
        </span>
      </div>

      {(!tournaments || tournaments.length === 0) ? (
        <EmptyState
          icon="🏌️"
          title="No Tournaments Yet"
          description="Create your first tournament to get started."
          action={
            <Link href={`/dashboard/leagues/${leagueId}/tournaments/new`} className="btn btn-accent">
              Create Tournament
            </Link>
          }
        />
      ) : (
        <LeagueTournaments
          tournaments={tournaments as any[]}
          leagueId={leagueId}
          leagueColor={league.primary_color}
        />
      )}
    </div>
  )
}
