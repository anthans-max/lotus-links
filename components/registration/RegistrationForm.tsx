'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { registerPlayers, addAndRegisterPlayer } from '@/lib/actions/registration'
import PoweredByFooter from '@/components/ui/PoweredByFooter'

interface TournamentInfo {
  id: string
  leagueId: string
  name: string
  date: string
  course: string
  format: string
}

interface PlayerInfo {
  id: string
  name: string
  grade: string | null
  status: string
}

interface RegistrationFormProps {
  tournament: TournamentInfo
  leagueName: string
  leagueColor?: string
  players: PlayerInfo[]
  isWish?: boolean
}

type Step = 'select' | 'pairings' | 'contact' | 'done'

export default function RegistrationForm({
  tournament,
  leagueName,
  leagueColor,
  players: initialPlayers,
  isWish = false,
}: RegistrationFormProps) {
  const accentStyle = leagueColor
    ? ({ '--league-accent': leagueColor, '--league-accent-dim': `color-mix(in srgb, ${leagueColor} 15%, transparent)`, '--league-accent-border': `color-mix(in srgb, ${leagueColor} 25%, transparent)` } as React.CSSProperties)
    : {}

  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('select')

  // Player selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [showAddNew, setShowAddNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [players, setPlayers] = useState(initialPlayers)

  // Pairing preferences: playerId -> Set of preferred player IDs
  const [pairings, setPairings] = useState<Record<string, Set<string>>>({})
  const [pairingSearch, setPairingSearch] = useState<Record<string, string>>({})

  // Contact info
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [willingToChaperone, setWillingToChaperone] = useState(false)
  const [comments, setComments] = useState('')
  const COMMENTS_MAX = 500

  const [error, setError] = useState<string | null>(null)

  // Filtered player list for selection
  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players
    const q = search.toLowerCase()
    return players.filter(p => p.name.toLowerCase().includes(q))
  }, [players, search])

  const selectedPlayers = players.filter(p => selectedIds.has(p.id))

  const togglePlayer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddNew = () => {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await addAndRegisterPlayer({
          tournamentId: tournament.id,
          name: newName,
          grade: newGrade || undefined,
          parentName: parentName || 'Parent',
          parentPhone: parentPhone || '',
        })
        // Add to local state and select
        const newPlayer: PlayerInfo = {
          id: result.id,
          name: newName.trim(),
          grade: newGrade.trim() || null,
          status: 'registered',
        }
        setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.name.localeCompare(b.name)))
        setSelectedIds(prev => new Set([...prev, result.id]))
        setNewName('')
        setNewGrade('')
        setShowAddNew(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add player')
      }
    })
  }

  const handlePairingToggle = (playerId: string, preferredId: string) => {
    setPairings(prev => {
      const current = new Set(prev[playerId] ?? [])
      if (current.has(preferredId)) current.delete(preferredId)
      else current.add(preferredId)
      return { ...prev, [playerId]: current }
    })
  }

  const handleSubmit = () => {
    if (!parentName.trim() || !parentPhone.trim()) {
      setError('Please fill in your name and phone number.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const pairingPrefs: Record<string, string[]> = {}
        for (const [pid, prefs] of Object.entries(pairings)) {
          if (prefs.size > 0) pairingPrefs[pid] = [...prefs]
        }
        await registerPlayers({
          tournamentId: tournament.id,
          playerIds: [...selectedIds],
          parentName,
          parentPhone,
          parentEmail,
          pairingPreferences: pairingPrefs,
          willingToChaperone,
          registrationComments: isWish ? comments : undefined,
        })
        setStep('done')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Registration failed. Please try again.')
      }
    })
  }

  const formattedDate = (() => {
    try {
      return new Date(tournament.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return tournament.date
    }
  })()

  // ─── Confirmation screen ──────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', ...accentStyle }}>
        <div style={{ textAlign: 'center', maxWidth: 420, width: '100%', animation: 'fadeUp 0.6s ease' }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--gold), #8a6a1e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '2.5rem',
              animation: 'checkPop 0.5s ease 0.2s both',
            }}
          >
            ✓
          </div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 400, marginBottom: '0.75rem', color: 'var(--text)' }}>
            You&apos;re All Set!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Registration confirmed for{' '}
            {selectedPlayers.map((p, i) => (
              <span key={p.id}>
                {i > 0 && (i === selectedPlayers.length - 1 ? ' and ' : ', ')}
                <strong style={{ color: 'var(--gold)' }}>{p.name}</strong>
              </span>
            ))}
          </p>

          <div className="card card-gold" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <div className="label" style={{ marginBottom: '0.5rem' }}>Tournament Details</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '0.35rem' }}>
              {tournament.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              {formattedDate}<br />
              {tournament.course}<br />
              {tournament.format} Format
            </div>
          </div>

          <a
            href={`/leaderboard/${tournament.id}`}
            className="btn"
            style={{
              width: '100%',
              marginBottom: '0.75rem',
              background: 'var(--forest)',
              color: '#f0ede6',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontFamily: 'var(--fd)',
              letterSpacing: '0.02em',
              textTransform: 'none',
              fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            View Leaderboard &rarr;
          </a>

          <PoweredByFooter />
        </div>
      </div>
    )
  }

  // ─── Main registration form ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', ...accentStyle }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(180deg, var(--forest) 0%, var(--bg) 100%)',
          padding: '2.5rem 1.25rem 2rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -30, right: -30, fontSize: '10rem', opacity: 0.03, pointerEvents: 'none' }}>⛳</div>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--gold), #5a3e10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
            }}
          >
            ⛳
          </div>
          <span style={{ fontFamily: 'var(--fd)', fontSize: '0.9rem', color: 'var(--gold)' }}>Lotus Links</span>
        </div>

        {leagueName && (
          <div className="section-tag" style={{ marginBottom: '0.5rem' }}>{leagueName}</div>
        )}
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.5rem, 6vw, 2.25rem)', fontWeight: 400, color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.15 }}>
          {tournament.name}
        </h1>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {formattedDate} &middot; {tournament.course}
        </div>
        <div className="gold-divider" style={{ margin: '1rem auto' }} />
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>
          Register your player{selectedIds.size > 1 ? 's' : ''} for this tournament
        </p>
      </div>

      {/* Progress steps */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', marginTop: '0.5rem' }}>
          {(['select', 'pairings', 'contact'] as Step[]).map((s, i) => {
            const labels = ['Players', 'Pairings', 'Contact']
            const stepOrder: Step[] = ['select', 'pairings', 'contact']
            const currentIdx = stepOrder.indexOf(step)
            const thisIdx = i
            const isDone = thisIdx < currentIdx
            const isActive = s === step
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {i > 0 && <div style={{ width: 24, height: 1, background: isDone || isActive ? 'var(--gold-border)' : 'var(--border)' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div className={`step-dot ${isDone ? 'done' : isActive ? 'active' : 'todo'}`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--fm)', letterSpacing: '0.1em', textTransform: 'uppercase', color: isActive ? 'var(--gold)' : 'var(--text-dim)' }}>
                    {labels[i]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'var(--over-dim)',
              border: '1px solid var(--over-border)',
              borderRadius: 2,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.82rem',
              color: 'var(--over)',
              animation: 'fadeUp 0.2s ease',
            }}
          >
            {error}
          </div>
        )}

        {/* ─── Step 1: Select Players ──────────────────────────────────── */}
        {step === 'select' && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: '0.35rem' }}>
              Select Your Player{selectedIds.size !== 1 ? 's' : ''}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Tap to select your child. You can select multiple if you have siblings playing.
            </p>

            {/* Search */}
            <input
              className="input"
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: '1rem', fontSize: '1rem' }}
            />

            {/* Player cards */}
            {filteredPlayers.length === 0 && !search ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  No players have been added yet.
                </div>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => setShowAddNew(true)}
                >
                  Add Your Child
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {filteredPlayers.map(p => {
                  const isSelected = selectedIds.has(p.id)
                  const isAlreadyRegistered = p.status === 'registered'
                  return (
                    <button
                      key={p.id}
                      onClick={() => !isAlreadyRegistered && togglePlayer(p.id)}
                      className="tap"
                      disabled={isAlreadyRegistered}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        background: isAlreadyRegistered ? 'var(--surface)' : isSelected ? 'var(--gold-dim)' : 'var(--surface)',
                        border: `1.5px solid ${isAlreadyRegistered ? 'var(--border)' : isSelected ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: 2,
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        minHeight: 56,
                        width: '100%',
                        fontFamily: 'inherit',
                        color: isAlreadyRegistered ? 'var(--text-muted)' : 'var(--text)',
                        fontSize: 'inherit',
                        cursor: isAlreadyRegistered ? 'default' : 'pointer',
                        opacity: isAlreadyRegistered ? 0.6 : 1,
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          border: `2px solid ${isAlreadyRegistered ? 'var(--border)' : isSelected ? 'var(--gold)' : 'var(--border2)'}`,
                          background: isAlreadyRegistered ? 'var(--surface2)' : isSelected ? 'var(--gold)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s',
                          fontSize: '0.75rem',
                          color: isAlreadyRegistered ? 'var(--text-dim)' : '#0a120a',
                          fontWeight: 700,
                        }}
                      >
                        {isAlreadyRegistered ? '—' : isSelected && '✓'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{p.name}</div>
                        {p.grade && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', marginTop: '0.1rem' }}>
                            Grade {p.grade}
                          </div>
                        )}
                      </div>
                      {isAlreadyRegistered && (
                        <span className="badge badge-green" style={{ fontSize: '0.58rem' }}>Registered</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* "I don't see my child" */}
            {!showAddNew ? (
              <button
                className="btn btn-ghost"
                style={{ width: '100%', marginBottom: '1.5rem', fontSize: '0.85rem' }}
                onClick={() => setShowAddNew(true)}
              >
                I don&apos;t see my child — Add them
              </button>
            ) : (
              <div className="card card-gold" style={{ marginBottom: '1.5rem', animation: 'fadeUp 0.25s ease' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.75rem' }}>
                  Add Your Child
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div className="label">Full Name</div>
                  <input
                    className="input"
                    placeholder="Your child's name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    autoFocus
                    style={{ fontSize: '1rem' }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <div className="label">Grade (optional)</div>
                  <input
                    className="input"
                    placeholder="e.g. 5th"
                    value={newGrade}
                    onChange={e => setNewGrade(e.target.value)}
                    style={{ fontSize: '1rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-gold" onClick={handleAddNew} disabled={isPending || !newName.trim()} style={{ flex: 1 }}>
                    {isPending ? 'Adding...' : 'Add & Select'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowAddNew(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Continue */}
            <button
              className="submit-btn"
              disabled={selectedIds.size === 0}
              onClick={() => {
                setError(null)
                setStep('pairings')
              }}
            >
              Continue — {selectedIds.size} player{selectedIds.size !== 1 ? 's' : ''} selected
            </button>
            <div style={{ height: '3rem' }} />
          </div>
        )}

        {/* ─── Step 2: Pairing Preferences ─────────────────────────────── */}
        {step === 'pairings' && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: '0.35rem' }}>
              Pairing Preferences
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Who would your child like to play with? This is optional — we&apos;ll do our best to honor requests.
            </p>

            {selectedPlayers.map(child => {
              // Exclude the child and their siblings from the preference list
              const available = players.filter(p => !selectedIds.has(p.id))
              const searchVal = pairingSearch[child.id] ?? ''
              const filteredAvail = searchVal
                ? available.filter(p => p.name.toLowerCase().includes(searchVal.toLowerCase()))
                : available
              const childPairings = pairings[child.id] ?? new Set()

              return (
                <div key={child.id} className="card" style={{ marginBottom: '1rem' }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.35rem' }}>
                    {child.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Who would they like to play with?
                  </div>

                  {/* Selected pairings chips */}
                  {childPairings.size > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                      {[...childPairings].map(pid => {
                        const p = players.find(pl => pl.id === pid)
                        if (!p) return null
                        return (
                          <button
                            key={pid}
                            onClick={() => handlePairingToggle(child.id, pid)}
                            className="tap"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: 'var(--gold-dim)',
                              border: '1px solid var(--gold-border)',
                              borderRadius: 20,
                              padding: '0.3rem 0.65rem',
                              fontSize: '0.78rem',
                              color: 'var(--gold)',
                              fontFamily: 'var(--fm)',
                              cursor: 'pointer',
                            }}
                          >
                            {p.name} <span style={{ fontSize: '0.65rem' }}>✕</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Search within available */}
                  <input
                    className="input"
                    placeholder="Search players..."
                    value={searchVal}
                    onChange={e => setPairingSearch(prev => ({ ...prev, [child.id]: e.target.value }))}
                    style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}
                  />

                  {/* Available players (scrollable) */}
                  <div style={{ maxHeight: 180, overflowY: 'auto', borderRadius: 2 }}>
                    {filteredAvail.length === 0 ? (
                      <div style={{ padding: '0.75rem', fontSize: '0.82rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                        No matching players
                      </div>
                    ) : (
                      filteredAvail.map(p => {
                        const isChosen = childPairings.has(p.id)
                        return (
                          <button
                            key={p.id}
                            onClick={() => handlePairingToggle(child.id, p.id)}
                            className="tap"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.5rem 0.65rem',
                              width: '100%',
                              background: isChosen ? 'var(--gold-dim)' : 'transparent',
                              border: 'none',
                              borderBottom: '1px solid var(--border)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '0.88rem',
                              color: isChosen ? 'var(--gold)' : 'var(--text)',
                              fontFamily: 'inherit',
                              transition: 'background 0.1s',
                              minHeight: 44,
                            }}
                          >
                            <div
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 3,
                                border: `1.5px solid ${isChosen ? 'var(--gold)' : 'var(--border2)'}`,
                                background: isChosen ? 'var(--gold)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.6rem',
                                color: '#0a120a',
                                flexShrink: 0,
                              }}
                            >
                              {isChosen && '✓'}
                            </div>
                            <span>{p.name}</span>
                            {p.grade && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                                {p.grade}
                              </span>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep('select')}>
                Back
              </button>
              <button
                className="submit-btn"
                style={{ flex: 2 }}
                onClick={() => {
                  setError(null)
                  setStep('contact')
                }}
              >
                Continue
              </button>
            </div>
            <div style={{ height: '3rem' }} />
          </div>
        )}

        {/* ─── Step 3: Contact Info ────────────────────────────────────── */}
        {step === 'contact' && (
          <div style={{ animation: 'fadeUp 0.4s ease' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: '0.35rem' }}>
              Your Contact Info
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              So we can reach you on tournament day if needed.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <div className="label">Parent / Guardian Name</div>
              <input
                className="input"
                placeholder="Your full name"
                value={parentName}
                onChange={e => setParentName(e.target.value)}
                style={{ fontSize: '1rem' }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div className="label">Phone Number</div>
              <input
                className="input"
                placeholder="(555) 123-4567"
                type="tel"
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value)}
                style={{ fontSize: '1rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="label">Email Address <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span></div>
              <input
                className="input"
                placeholder="you@example.com"
                type="email"
                value={parentEmail}
                onChange={e => setParentEmail(e.target.value)}
                style={{ fontSize: '1rem' }}
              />
            </div>

            {/* Chaperone volunteer */}
            <div className="card" style={{ marginBottom: '1.5rem', animation: 'fadeUp 0.3s ease 0.1s both' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                Would You Like to Help?
              </div>
              <button
                onClick={() => setWillingToChaperone(!willingToChaperone)}
                className="tap"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: willingToChaperone ? 'var(--gold-dim)' : 'var(--surface2)',
                  border: `1.5px solid ${willingToChaperone ? 'var(--gold)' : 'var(--border)'}`,
                  borderRadius: 8,
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  width: '100%',
                  fontFamily: 'inherit',
                  color: 'var(--text)',
                  fontSize: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    border: `2px solid ${willingToChaperone ? 'var(--gold)' : 'var(--border2)'}`,
                    background: willingToChaperone ? 'var(--gold)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                    fontSize: '0.75rem',
                    color: '#0a120a',
                    fontWeight: 700,
                    marginTop: '0.1rem',
                  }}
                >
                  {willingToChaperone && '✓'}
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    I&apos;m willing to chaperone a group on tournament day
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Chaperones walk with a group of players and enter scores on their phone. No golf experience needed!
                  </div>
                </div>
              </button>
            </div>

            {/* WISH-only: special requests / comments */}
            {isWish && (
              <div style={{ marginBottom: '1.5rem', animation: 'fadeUp 0.3s ease 0.15s both' }}>
                <div className="label">
                  Special Requests or Preferences{' '}
                  <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
                </div>
                <textarea
                  className="input"
                  rows={4}
                  maxLength={COMMENTS_MAX}
                  placeholder="e.g. earlier tee time preferred, mobility considerations, etc."
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  style={{ resize: 'none', fontSize: '0.95rem', lineHeight: 1.6 }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--fm)',
                  color: comments.length > COMMENTS_MAX * 0.9 ? 'var(--over)' : 'var(--text-dim)',
                  marginTop: '0.25rem',
                }}>
                  {comments.length} / {COMMENTS_MAX}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="label" style={{ marginBottom: '0.5rem' }}>Registration Summary</div>
              {selectedPlayers.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--gold-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      color: 'var(--gold)',
                      fontFamily: 'var(--fm)',
                      flexShrink: 0,
                    }}
                  >
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, fontSize: '0.9rem' }}>{p.name}</div>
                  {(pairings[p.id]?.size ?? 0) > 0 && (
                    <span className="badge badge-blue" style={{ fontSize: '0.58rem' }}>
                      {pairings[p.id]?.size} pair pref{(pairings[p.id]?.size ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep('pairings')}>
                Back
              </button>
              <button
                className="submit-btn"
                style={{ flex: 2 }}
                disabled={isPending || !parentName.trim() || !parentPhone.trim()}
                onClick={handleSubmit}
              >
                {isPending ? 'Registering...' : 'Confirm Registration'}
              </button>
            </div>
            <div style={{ height: '1rem' }} />
          </div>
        )}

        <PoweredByFooter />
      </div>
    </div>
  )
}
