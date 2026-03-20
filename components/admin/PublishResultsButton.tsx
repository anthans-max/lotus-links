'use client'

import { useState, useTransition } from 'react'
import { setResultsPublished } from '@/lib/actions/divisions'

interface Props {
  tournamentId: string
  leagueId: string
  resultsPublished: boolean
}

export default function PublishResultsButton({ tournamentId, leagueId, resultsPublished }: Props) {
  const [published, setPublished] = useState(resultsPublished)
  const [isPending, startTransition] = useTransition()
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)

  const handlePublish = () => {
    startTransition(async () => {
      await setResultsPublished(tournamentId, leagueId, true)
      setPublished(true)
    })
  }

  const handleUnpublish = () => {
    setConfirmUnpublish(false)
    startTransition(async () => {
      await setResultsPublished(tournamentId, leagueId, false)
      setPublished(false)
    })
  }

  if (published) {
    return (
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.25rem',
        }}
      >
        <div style={{ fontSize: '1.5rem' }}>🏆</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.15rem' }}>
            Results Published
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
            Celebration view is live on the leaderboard
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-gold" style={{ fontSize: '0.58rem' }}>Published</span>
          {confirmUnpublish ? (
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unpublish?</span>
              <button
                onClick={handleUnpublish}
                disabled={isPending}
                className="btn btn-sm"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmUnpublish(false)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.7rem' }}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmUnpublish(true)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.72rem' }}
            >
              Unpublish
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem 1.25rem',
      }}
    >
      <div style={{ fontSize: '1.5rem' }}>🏆</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.15rem' }}>
          Publish Results
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
          Activates winner celebration view on the leaderboard
        </div>
      </div>
      <button
        onClick={handlePublish}
        disabled={isPending}
        className="btn btn-gold btn-sm"
        style={{ fontSize: '0.82rem' }}
      >
        {isPending ? 'Publishing...' : 'Publish Results'}
      </button>
    </div>
  )
}
