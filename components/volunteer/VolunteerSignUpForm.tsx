'use client'

import { useState, useTransition } from 'react'
import { signUpVolunteer } from '@/lib/actions/volunteers'

const ROLE_OPTIONS = [
  { value: 'Check-In Table', label: 'Check-In Table', desc: 'Greet families & check players in' },
  { value: 'Swag Bag Handouts', label: 'Swag Bag Handouts', desc: 'Distribute swag bags to players' },
  { value: 'On-Course Support', label: 'On-Course Support', desc: 'Help groups on the course' },
  { value: 'Lunch Setup & Service', label: 'Lunch Setup & Service', desc: 'Help set up and serve lunch' },
  { value: 'Photos & Scoreboard', label: 'Photos & Scoreboard', desc: 'Capture moments & update scores' },
  { value: 'General Help', label: 'General Help', desc: 'Available wherever needed' },
]

interface Props {
  tournamentId: string
}

export default function VolunteerSignUpForm({ tournamentId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDuplicate, setIsDuplicate] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }

  const canSubmit = name.trim() && email.trim() && selectedRoles.size > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    setErrorMsg(null)
    setIsDuplicate(false)

    startTransition(async () => {
      const result = await signUpVolunteer({
        tournamentId,
        name,
        email,
        phone: phone || undefined,
        roles: Array.from(selectedRoles),
        notes: notes || undefined,
      })

      if (result.success) {
        setDone(true)
      } else {
        setIsDuplicate(result.duplicate)
        setErrorMsg(result.message)
      }
    })
  }

  const handleReset = () => {
    setDone(false)
    setErrorMsg(null)
    setIsDuplicate(false)
    setName('')
    setEmail('')
    setPhone('')
    setSelectedRoles(new Set())
    setNotes('')
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', color: 'var(--gold)', margin: '0 0 0.75rem' }}>
          You&apos;re signed up!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          Thank you for volunteering. We&apos;ll be in touch with details closer to the tournament.
        </p>
        <button
          onClick={handleReset}
          className="btn btn-outline"
          style={{ fontSize: '0.875rem' }}
        >
          Sign up another volunteer
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
        Thank you for helping make this tournament possible! Fill out the form below and we&apos;ll be in touch.
      </p>

      {/* Name */}
      <div>
        <label className="label" style={{ display: 'block', marginBottom: '0.4rem' }}>
          Name <span style={{ color: 'var(--gold)' }}>*</span>
        </label>
        <input
          className="input"
          type="text"
          placeholder="Your full name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {/* Email */}
      <div>
        <label className="label" style={{ display: 'block', marginBottom: '0.4rem' }}>
          Email <span style={{ color: 'var(--gold)' }}>*</span>
        </label>
        <input
          className="input"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {/* Phone */}
      <div>
        <label className="label" style={{ display: 'block', marginBottom: '0.4rem' }}>
          Phone <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          className="input"
          type="tel"
          placeholder="(555) 555-5555"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {/* Role selection */}
      <div>
        <label className="label" style={{ display: 'block', marginBottom: '0.75rem' }}>
          How would you like to help? <span style={{ color: 'var(--gold)' }}>*</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          {ROLE_OPTIONS.map(role => {
            const selected = selectedRoles.has(role.value)
            return (
              <button
                key={role.value}
                type="button"
                onClick={() => toggleRole(role.value)}
                style={{
                  background: selected ? 'var(--gold-dim)' : 'var(--surface)',
                  border: `1px solid ${selected ? 'var(--gold)' : 'var(--border2)'}`,
                  borderRadius: '0.5rem',
                  padding: '0.75rem 0.6rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: selected ? 'var(--gold)' : 'var(--text)',
                  marginBottom: '0.2rem',
                  lineHeight: 1.3,
                }}>
                  {role.label}
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.3,
                }}>
                  {role.desc}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label" style={{ display: 'block', marginBottom: '0.4rem' }}>
          Notes <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
        </label>
        <textarea
          className="input"
          placeholder="Time constraints, questions, etc."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {/* Error message */}
      {errorMsg && (
        <div style={{
          background: 'rgba(200,168,75,0.1)',
          border: '1px solid var(--gold-border)',
          borderRadius: '0.5rem',
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
          color: isDuplicate ? 'var(--gold)' : 'var(--over)',
        }}>
          {errorMsg}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isPending}
        className="btn btn-gold"
        style={{
          width: '100%',
          padding: '0.875rem',
          fontSize: '0.95rem',
          opacity: !canSubmit || isPending ? 0.5 : 1,
          cursor: !canSubmit || isPending ? 'not-allowed' : 'pointer',
        }}
      >
        {isPending ? 'Signing up…' : 'Sign Up to Volunteer'}
      </button>
    </div>
  )
}
