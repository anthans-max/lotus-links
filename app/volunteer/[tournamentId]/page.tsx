import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import VolunteerSignUpForm from '@/components/volunteer/VolunteerSignUpForm'
import PoweredByFooter from '@/components/ui/PoweredByFooter'

export const metadata: Metadata = {
  title: 'Volunteer Sign-Up',
  description: 'Sign up to volunteer at the tournament',
}

interface Props {
  params: Promise<{ tournamentId: string }>
}

export default async function VolunteerSignUpPage({ params }: Props) {
  const { tournamentId } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, date, course, status')
    .eq('id', tournamentId)
    .single()

  if (!tournament) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⛳</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.5rem' }}>Tournament not found</div>
          <div style={{ fontSize: '0.875rem' }}>This link may be invalid or the tournament has been removed.</div>
        </div>
      </div>
    )
  }

  const formattedDate = new Date(tournament.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, var(--forest) 0%, var(--surface) 100%)',
        borderBottom: '1px solid var(--gold-border)',
        padding: '2rem 1.25rem 1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤝</div>
        <h1 style={{
          fontFamily: 'var(--fd)',
          fontSize: 'clamp(1.4rem, 5vw, 2rem)',
          color: 'var(--gold)',
          margin: '0 0 0.5rem',
          lineHeight: 1.2,
        }}>
          Volunteer Sign-Up
        </h1>
        <p style={{ fontFamily: 'var(--fd)', fontSize: '1.05rem', color: 'var(--text)', margin: '0 0 0.25rem' }}>
          {tournament.name}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', margin: 0 }}>
          {formattedDate}
        </p>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: '1.5rem 1.25rem', maxWidth: '480px', width: '100%', margin: '0 auto' }}>
        <VolunteerSignUpForm tournamentId={tournament.id} />
      </div>

      <PoweredByFooter />
    </div>
  )
}
