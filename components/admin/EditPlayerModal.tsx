'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { Player } from '@/lib/types'
import { updatePlayer } from '@/lib/actions/players'

interface EditPlayerModalProps {
  player: Player
  isWish?: boolean
  onClose: () => void
}

export default function EditPlayerModal({ player, isWish = false, onClose }: EditPlayerModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState(player.name)
  const [grade, setGrade] = useState(player.grade ?? '')
  const [handicapIndex, setHandicapIndex] = useState(
    player.handicap_index != null ? String(player.handicap_index) : ''
  )
  const [skillLevel, setSkillLevel] = useState(player.skill_level ?? '')
  const [playerEmail, setPlayerEmail] = useState(player.player_email ?? '')
  const [error, setError] = useState<string | null>(null)

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleSave = () => {
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        if (isWish) {
          await updatePlayer(player.id, {
            name: name.trim(),
            grade: grade.trim() || null,
          })
        } else {
          const hdcpIdx = handicapIndex !== '' ? parseFloat(handicapIndex) : null
          await updatePlayer(player.id, {
            name: name.trim(),
            handicap_index: hdcpIdx != null && !isNaN(hdcpIdx) ? hdcpIdx : null,
            skill_level: skillLevel || null,
            player_email: playerEmail.trim() || null,
          })
        }
        router.refresh()
        onClose()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update player')
      }
    })
  }

  const initials = player.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const hasContactInfo =
    player.parent_name || player.parent_phone || player.parent_email || player.registration_comments

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
          maxWidth: 480,
          width: '100%',
          padding: '1.5rem',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          animation: 'fadeUp 0.2s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--surface3)',
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
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', lineHeight: 1.2 }}>
              Edit Player
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', marginTop: '0.15rem' }}>
              {player.status === 'checked_in'
                ? 'Checked In'
                : player.status === 'registered'
                ? 'Registered'
                : 'Pre-registered'}
            </div>
          </div>
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

        {/* Editable fields */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              color: 'var(--gold)',
              textTransform: 'uppercase',
              fontFamily: 'var(--fm)',
              marginBottom: '0.75rem',
            }}
          >
            Player Info
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div className="label">Full Name</div>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoFocus
              />
            </div>
            {isWish ? (
              <div>
                <div className="label">
                  Grade{' '}
                  <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
                </div>
                <input
                  className="input"
                  placeholder="e.g. 5th"
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
              </div>
            ) : (
              <>
                <div>
                  <div className="label">
                    Handicap Index{' '}
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
                  </div>
                  <input
                    className="input"
                    type="number"
                    min="-10"
                    max="54"
                    step="0.1"
                    placeholder="e.g. 12.4"
                    value={handicapIndex}
                    onChange={e => setHandicapIndex(e.target.value)}
                  />
                </div>
                <div>
                  <div className="label">
                    Skill Level{' '}
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
                  </div>
                  <select
                    className="input"
                    value={skillLevel}
                    onChange={e => setSkillLevel(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">— Select skill level —</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div>
                  <div className="label">
                    Player Email{' '}
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional — for scoring link)</span>
                  </div>
                  <input
                    className="input"
                    type="email"
                    placeholder="player@example.com"
                    value={playerEmail}
                    onChange={e => setPlayerEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contact info — WISH only, read-only */}
        {isWish && hasContactInfo && (
          <div
            style={{
              borderTop: '1px solid var(--border2)',
              paddingTop: '1.25rem',
              marginBottom: '1.25rem',
            }}
          >
            <div
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.12em',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                fontFamily: 'var(--fm)',
                marginBottom: '0.75rem',
              }}
            >
              Contact Info — Submitted at registration
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <ContactRow label="Guardian / Parent" value={player.parent_name} />
              <ContactRow
                label="Phone"
                value={player.parent_phone}
                href={player.parent_phone ? `tel:${player.parent_phone}` : undefined}
              />
              <ContactRow
                label="Email"
                value={player.parent_email}
                href={player.parent_email ? `mailto:${player.parent_email}` : undefined}
              />
              {player.willing_to_chaperone && (
                <div style={{ marginTop: '0.1rem' }}>
                  <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>
                    Volunteer Chaperone
                  </span>
                </div>
              )}
              {player.registration_comments && (
                <div>
                  <div
                    style={{
                      fontSize: '0.6rem',
                      color: 'var(--text-dim)',
                      fontFamily: 'var(--fm)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Comments
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                    }}
                  >
                    {player.registration_comments}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'var(--over-dim)',
              border: '1px solid var(--over-border)',
              borderRadius: 2,
              padding: '0.6rem 0.75rem',
              marginBottom: '1rem',
              fontSize: '0.82rem',
              color: 'var(--over)',
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button
            className="btn btn-gold btn-sm"
            onClick={handleSave}
            disabled={isPending || !name.trim()}
          >
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ContactRow({
  label,
  value,
  href,
}: {
  label: string
  value: string | null | undefined
  href?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span
        style={{
          fontSize: '0.62rem',
          color: 'var(--text-dim)',
          fontFamily: 'var(--fm)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          minWidth: 100,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {value ? (
        href ? (
          <a href={href} style={{ fontSize: '0.85rem', color: 'var(--gold)', textDecoration: 'none' }}>
            {value}
          </a>
        ) : (
          <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{value}</span>
        )
      ) : (
        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
          Not provided
        </span>
      )}
    </div>
  )
}
