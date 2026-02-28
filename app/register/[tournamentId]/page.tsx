import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import RegistrationForm from '@/components/registration/RegistrationForm'
import PoweredByFooter from '@/components/ui/PoweredByFooter'

export const metadata: Metadata = {
  title: 'Register',
  description: 'Register your player for the tournament',
}

interface Props {
  params: Promise<{ tournamentId: string }>
}

export default async function RegisterPage({ params }: Props) {
  const { tournamentId } = await params
  const supabase = await createClient()

  // Fetch tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, date, course, format, status, league_id')
    .eq('id', tournamentId)
    .single()

  if (!tournament) {
    return <NotFoundView />
  }

  if (tournament.status === 'completed') {
    return <ClosedView tournamentName={tournament.name} />
  }

  // Fetch league for branding and WISH gating
  const { data: league } = await supabase
    .from('leagues')
    .select('name, primary_color, league_type')
    .eq('id', tournament.league_id)
    .single()

  // Fetch players for this tournament
  const { data: players } = await supabase
    .from('players')
    .select('id, name, grade, status')
    .eq('tournament_id', tournamentId)
    .order('name')

  const isWish = league?.league_type === 'wish'

  return (
    <RegistrationForm
      tournament={{
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
        course: tournament.course,
        format: tournament.format,
      }}
      leagueName={league?.name ?? ''}
      leagueColor={league?.primary_color ?? undefined}
      players={players ?? []}
      isWish={isWish}
    />
  )
}

function NotFoundView() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛳</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
          Tournament Not Found
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          This registration link doesn&apos;t match any tournament. Please check with your tournament organizer for the correct link.
        </p>
        <PoweredByFooter />
      </div>
    </div>
  )
}

function ClosedView({ tournamentName }: { tournamentName: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏁</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
          Registration Closed
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Registration for <strong style={{ color: 'var(--gold)' }}>{tournamentName}</strong> has closed. Contact the tournament organizer if you have questions.
        </p>
        <PoweredByFooter />
      </div>
    </div>
  )
}
