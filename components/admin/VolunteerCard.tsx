'use client'

import { useState, useTransition } from 'react'
import { getBaseUrl } from '@/lib/url'
import { deleteVolunteer } from '@/lib/actions/volunteers'
import type { Volunteer } from '@/lib/actions/volunteers'

interface Props {
  tournamentId: string
  leagueId: string
  initialVolunteers: Volunteer[]
}

export default function VolunteerCard({ tournamentId, leagueId, initialVolunteers }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [volunteers, setVolunteers] = useState(initialVolunteers)
  const [isPending, startTransition] = useTransition()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleCopy = async () => {
    const url = `${getBaseUrl()}/volunteer/${tournamentId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteVolunteer(id, leagueId, tournamentId)
      setVolunteers(prev => prev.filter(v => v.id !== id))
      setConfirmDeleteId(null)
    })
  }

  const count = volunteers.length

  return (
    <div className="card" style={{ padding: '1rem 1.25rem' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '1.5rem' }}>🤝</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.15rem' }}>
            Volunteer Sign-Ups
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
            {count === 0
              ? 'No volunteers yet'
              : `${count} volunteer${count !== 1 ? 's' : ''} signed up`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {count > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              {expanded ? 'Hide' : 'View'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="btn btn-outline"
            style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {copied ? (
              <><span style={{ color: '#4CAF50' }}>✓</span> Copied!</>
            ) : (
              <>🤝 Copy Volunteer Link</>
            )}
          </button>
        </div>
      </div>

      {/* Expanded volunteer list */}
      {expanded && count > 0 && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {volunteers.map(v => (
            <div
              key={v.id}
              style={{
                background: 'var(--surface2)',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem', marginBottom: '0.15rem' }}>
                  {v.name}
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>
                  {v.email}
                  {v.phone && <span style={{ marginLeft: '0.5rem' }}>· {v.phone}</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                  {v.roles.map(role => (
                    <span
                      key={role}
                      style={{
                        fontSize: '0.65rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        border: '1px solid var(--gold-border)',
                        color: 'var(--gold)',
                        background: 'var(--gold-dim)',
                        fontFamily: 'var(--fm)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {role}
                    </span>
                  ))}
                </div>
                {v.notes && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                    {v.notes}
                  </div>
                )}
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.3rem', fontFamily: 'var(--fm)' }}>
                  Signed up {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {/* Delete */}
              <div style={{ flexShrink: 0 }}>
                {confirmDeleteId === v.id ? (
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--over)' }}>Remove?</span>
                    <button
                      onClick={() => handleDelete(v.id)}
                      disabled={isPending}
                      className="btn btn-sm"
                      style={{ fontSize: '0.7rem', background: 'var(--over)', color: '#fff', border: 'none', padding: '0.2rem 0.5rem' }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.7rem' }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(v.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.8rem', color: 'var(--text-dim)', padding: '0.2rem 0.4rem' }}
                    title="Remove volunteer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
