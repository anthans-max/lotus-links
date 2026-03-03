'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Player } from '@/lib/types'

interface VolunteersPanelProps {
  volunteers: Player[]
  tournamentId: string
  onClose: () => void
}

export default function VolunteersPanel({ volunteers, tournamentId, onClose }: VolunteersPanelProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const exportCSV = () => {
    const rows = [
      ['Name', 'Grade', 'Guardian', 'Phone', 'Email', 'Status'],
      ...volunteers.map(v => [
        v.name,
        v.grade ?? '',
        v.parent_name ?? '',
        v.parent_phone ?? '',
        v.parent_email ?? '',
        v.status,
      ]),
    ]
    const csv = rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `volunteers-${tournamentId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 560,
          width: '100%',
          padding: '1.5rem',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          animation: 'fadeUp 0.2s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', lineHeight: 1.2 }}>
              Volunteer Chaperones
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {volunteers.length} parent{volunteers.length !== 1 ? 's' : ''} opted in
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            {volunteers.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={exportCSV}>
                Export CSV
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '1.4rem',
                lineHeight: 1,
                padding: '0.25rem',
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Volunteer cards */}
        {volunteers.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 1.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
            }}
          >
            No volunteers yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {volunteers.map(v => {
              const initials = v.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
              return (
                <div
                  key={v.id}
                  className="card"
                  style={{ padding: '1rem', background: 'var(--surface2)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--surface3)',
                        border: '1px solid var(--gold-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        color: 'var(--gold)',
                        flexShrink: 0,
                        fontFamily: 'var(--fm)',
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name + badges */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          flexWrap: 'wrap',
                          marginBottom: '0.6rem',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--fd)', fontSize: '1rem' }}>{v.name}</span>
                        <span
                          className="badge badge-gold"
                          style={{ fontSize: '0.5rem', padding: '0.1rem 0.35rem' }}
                        >
                          Volunteer
                        </span>
                        {v.grade && (
                          <span className="badge badge-gray" style={{ fontSize: '0.5rem' }}>
                            {v.grade}
                          </span>
                        )}
                        <StatusBadge status={v.status} />
                      </div>
                      {/* Contact info */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                          gap: '0.4rem 1rem',
                        }}
                      >
                        {v.parent_name && (
                          <ContactItem label="Guardian" value={v.parent_name} />
                        )}
                        {v.parent_phone && (
                          <ContactItem
                            label="Phone"
                            value={v.parent_phone}
                            href={`tel:${v.parent_phone}`}
                          />
                        )}
                        {v.parent_email && (
                          <ContactItem
                            label="Email"
                            value={v.parent_email}
                            href={`mailto:${v.parent_email}`}
                          />
                        )}
                      </div>
                      {v.registration_comments && (
                        <div
                          style={{
                            marginTop: '0.6rem',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            fontStyle: 'italic',
                            lineHeight: 1.4,
                          }}
                        >
                          💬 {v.registration_comments}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'checked_in':
      return <span className="badge badge-gold" style={{ fontSize: '0.5rem' }}>Checked In</span>
    case 'registered':
      return <span className="badge badge-green" style={{ fontSize: '0.5rem' }}>Registered</span>
    default:
      return <span className="badge badge-gray" style={{ fontSize: '0.5rem' }}>Pre-registered</span>
  }
}

function ContactItem({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  return (
    <div>
      <div
        style={{
          fontSize: '0.6rem',
          color: 'var(--text-dim)',
          fontFamily: 'var(--fm)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.15rem',
        }}
      >
        {label}
      </div>
      {href ? (
        <a
          href={href}
          style={{
            fontSize: '0.78rem',
            color: 'var(--gold)',
            textDecoration: 'none',
            wordBreak: 'break-all',
          }}
        >
          {value}
        </a>
      ) : (
        <span style={{ fontSize: '0.78rem', color: 'var(--text)', wordBreak: 'break-all' }}>
          {value}
        </span>
      )}
    </div>
  )
}
