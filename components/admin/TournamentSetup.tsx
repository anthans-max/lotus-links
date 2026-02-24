'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Tournament, Hole } from '@/lib/types'
import { createTournamentWithWishHoles, updateTournament } from '@/lib/actions/tournament'
import { WISH_HOLES } from '@/lib/course-data'

interface TournamentSetupProps {
  tournament: Tournament | null
  holes: Hole[]
  onCreated: () => void
}

const STEPS = ['Details', 'Course Preview']

export default function TournamentSetup({ tournament, holes, onCreated }: TournamentSetupProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: tournament?.name ?? 'WISH Charter School Golf Tournament',
    date: tournament?.date ?? new Date().toISOString().split('T')[0],
    course_name: tournament?.course || 'The Lakes at El Segundo',
    format: tournament?.format ?? 'Scramble',
  })

  const upd = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const displayHoles = holes.length > 0 ? holes : WISH_HOLES.map((h, i) => ({
    id: `preview-${i}`,
    tournament_id: '',
    hole_number: h.hole_number,
    par: h.par,
    yardage: h.yardage,
  }))

  const totalPar = displayHoles.reduce((sum, h) => sum + h.par, 0)
  const totalYards = displayHoles.reduce((sum, h) => sum + (h.yardage || 0), 0)

  const handleCreate = () => {
    setError(null)
    startTransition(async () => {
      try {
        await createTournamentWithWishHoles(form)
        router.refresh()
        onCreated()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create tournament')
      }
    })
  }

  const handleUpdate = () => {
    if (!tournament) return
    setError(null)
    startTransition(async () => {
      try {
        await updateTournament(tournament.id, form)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update tournament')
      }
    })
  }

  const alreadyExists = !!tournament

  return (
    <div className="section">
      <span className="section-tag">Admin Panel</span>
      <div className="gold-divider" />
      <h2 className="section-title" style={{ marginBottom: '2rem' }}>
        Tournament Setup
      </h2>

      {/* Step progress */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
                cursor: 'pointer',
              }}
              onClick={() => setStep(i)}
            >
              <div className={`step-dot ${i < step ? 'done' : i === step ? 'active' : 'todo'}`}>
                {i < step ? '\u2713' : i + 1}
              </div>
              <div
                style={{
                  fontSize: '0.58rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: i === step ? 'var(--gold)' : 'var(--text-dim)',
                  fontFamily: 'var(--fm)',
                  whiteSpace: 'nowrap',
                }}
              >
                {s}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 48,
                  height: 1,
                  background: i < step ? 'var(--gold)' : 'var(--border)',
                  margin: '0 0.5rem',
                  marginBottom: '1.2rem',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: 'rgba(192,57,43,0.12)',
            border: '1px solid rgba(192,57,43,0.3)',
            borderRadius: 2,
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.82rem',
            color: '#e74c3c',
          }}
        >
          {error}
        </div>
      )}

      <div className="card card-gold" style={{ animation: 'fadeIn 0.3s ease' }}>
        {/* Step 1: Tournament Details */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                fontFamily: 'var(--fd)',
                fontSize: '1.25rem',
                color: 'var(--text)',
                marginBottom: '0.25rem',
              }}
            >
              Tournament Details
            </div>
            <div>
              <div className="label">Tournament Name</div>
              <input
                className="input"
                value={form.name}
                onChange={e => upd('name', e.target.value)}
                placeholder="Tournament name"
              />
            </div>
            <div className="g2">
              <div>
                <div className="label">Date</div>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={e => upd('date', e.target.value)}
                />
              </div>
              <div>
                <div className="label">Course Name</div>
                <input
                  className="input"
                  value={form.course_name}
                  onChange={e => upd('course_name', e.target.value)}
                />
              </div>
            </div>
            <div>
              <div className="label">Format</div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {['Scramble', 'Stroke Play', 'Best Ball'].map(f => (
                  <button
                    key={f}
                    className={`btn ${form.format === f ? 'btn-gold' : 'btn-ghost'}`}
                    onClick={() => upd('format', f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Course Preview */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                fontFamily: 'var(--fd)',
                fontSize: '1.25rem',
                color: 'var(--text)',
                marginBottom: '0.25rem',
              }}
            >
              Course Configuration
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6,
              }}
            >
              {form.course_name} &middot; {displayHoles.length} holes &middot; All Par 3 &middot;{' '}
              {totalYards.toLocaleString()} yards total
            </div>

            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="sc-table" style={{ minWidth: 400 }}>
                <thead>
                  <tr>
                    <th>Hole</th>
                    <th>Par</th>
                    <th>Yards</th>
                  </tr>
                </thead>
                <tbody>
                  {displayHoles.map(h => (
                    <tr key={h.hole_number}>
                      <td style={{ color: 'var(--gold)' }}>{h.hole_number}</td>
                      <td>{h.par}</td>
                      <td>{h.yardage}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--forest)' }}>
                    <td style={{ color: 'var(--gold)', fontWeight: 600 }}>TOTAL</td>
                    <td style={{ color: 'var(--gold)' }}>{totalPar}</td>
                    <td style={{ color: 'var(--gold)' }}>{totalYards.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Create / Update button */}
            <button
              className="btn btn-gold"
              style={{ width: '100%', padding: '1rem', fontSize: '0.85rem', marginTop: '0.5rem' }}
              onClick={alreadyExists ? handleUpdate : handleCreate}
              disabled={isPending}
            >
              {isPending
                ? 'Saving...'
                : alreadyExists
                  ? 'Update Tournament'
                  : 'Create Tournament'}
            </button>
          </div>
        )}

        {/* Step nav */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            className="btn btn-ghost"
            disabled={step === 0}
            onClick={() => setStep(s => s - 1)}
            style={{ opacity: step === 0 ? 0.3 : 1 }}
          >
            &larr; Back
          </button>
          {step < STEPS.length - 1 && (
            <button className="btn btn-gold" onClick={() => setStep(s => s + 1)}>
              Continue &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
