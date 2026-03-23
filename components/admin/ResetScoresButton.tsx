'use client'

import { useState } from 'react'
import { resetTournamentScores } from '@/lib/actions/scores'

interface Props {
  tournamentId: string
  scoreCount: number
}

export default function ResetScoresButton({ tournamentId, scoreCount }: Props) {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'pending' | 'done'>('idle')
  const [confirmText, setConfirmText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async () => {
    setPhase('pending')
    setError(null)
    try {
      const { deleted } = await resetTournamentScores(tournamentId)
      setResult(`All scores cleared — ${deleted} score ${deleted !== 1 ? 'entries' : 'entry'} deleted`)
      setPhase('done')
      setConfirmText('')
      setTimeout(() => { setResult(null); setPhase('idle') }, 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset scores')
      setPhase('confirm')
    }
  }

  if (scoreCount === 0 && phase === 'idle') return null

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        borderColor: phase === 'confirm' ? 'var(--gold-border)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '1.5rem' }}>🔄</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.15rem' }}>
            Reset All Scores
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
            {scoreCount} score {scoreCount !== 1 ? 'entries' : 'entry'} — clears all scores and resets groups to not started
          </div>
        </div>
        {phase === 'idle' && (
          <button
            onClick={() => setPhase('confirm')}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.82rem', color: 'var(--over)', borderColor: 'var(--gold-border)' }}
          >
            Reset All Scores
          </button>
        )}
      </div>

      {phase === 'confirm' && (
        <div
          style={{
            background: 'var(--gold-dim)',
            border: '1px solid var(--gold-border)',
            borderRadius: 8,
            padding: '1rem',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            This will permanently delete all entered scores for this tournament.
            This cannot be undone. Type <strong style={{ color: 'var(--gold)', fontFamily: 'var(--fm)' }}>RESET</strong> to confirm.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type RESET"
              className="input"
              style={{ flex: 1, fontSize: '0.85rem', fontFamily: 'var(--fm)', padding: '0.5rem 0.75rem' }}
              autoFocus
            />
            <button
              onClick={handleReset}
              disabled={confirmText !== 'RESET'}
              className="btn btn-sm"
              style={{
                fontSize: '0.82rem',
                background: confirmText === 'RESET' ? 'var(--over)' : 'var(--surface3)',
                color: confirmText === 'RESET' ? 'var(--bg)' : 'var(--text-dim)',
                fontWeight: 600,
                border: 'none',
              }}
            >
              Confirm Reset
            </button>
            <button
              onClick={() => { setPhase('idle'); setConfirmText(''); setError(null) }}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.82rem' }}
            >
              Cancel
            </button>
          </div>
          {error && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--over)' }}>{error}</div>
          )}
        </div>
      )}

      {phase === 'pending' && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
          Resetting scores...
        </div>
      )}

      {result && (
        <div style={{
          fontSize: '0.82rem',
          color: 'var(--gold)',
          fontFamily: 'var(--fm)',
          background: 'var(--gold-dim)',
          borderRadius: 6,
          padding: '0.5rem 0.75rem',
        }}>
          {result}
        </div>
      )}
    </div>
  )
}
