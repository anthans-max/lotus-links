'use client'

import { useState } from 'react'
import { getBaseUrl } from '@/lib/url'

interface Props {
  tournamentId: string
}

type State = 'idle' | 'loading' | 'success' | 'error'

export default function SendScorecardButton({ tournamentId }: Props) {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleClick() {
    setState('loading')
    setMessage(null)
    try {
      const res = await fetch('/api/email/send-scoring-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'scorecard-summary', tournamentId, baseUrl: getBaseUrl() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState('error')
        setMessage(data.error ?? 'Failed to send')
        return
      }
      setState('success')
      const skipNote = data.skipped > 0 ? ` · ${data.skipped} skipped (no email)` : ''
      setMessage(`Sent to ${data.sent} player${data.sent !== 1 ? 's' : ''}${skipNote}`)
    } catch {
      setState('error')
      setMessage('Network error — please try again')
    }
  }

  if (state === 'success') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.72rem',
        color: '#4caf50',
        fontFamily: 'var(--fm)',
      }}>
        ✓ {message}
      </span>
    )
  }

  if (state === 'error') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--over)', fontFamily: 'var(--fm)' }}>
          ✗ {message}
        </span>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => { setState('idle'); setMessage(null) }}
        >
          Retry
        </button>
      </span>
    )
  }

  return (
    <button
      className="btn btn-outline btn-sm"
      onClick={handleClick}
      disabled={state === 'loading'}
    >
      {state === 'loading' ? 'Sending…' : 'Send Emails'}
    </button>
  )
}
