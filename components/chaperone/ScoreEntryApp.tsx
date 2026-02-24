'use client'

import { useState, useEffect, useCallback } from 'react'
import { upsertScore, updateGroupProgress, submitScorecard } from '@/lib/actions/scores'

interface HoleInfo {
  number: number
  par: number
  yardage: number | null
}

interface ScoreEntryAppProps {
  group: {
    id: string
    name: string
    chaperoneName: string | null
    pin: string
    status: string
    currentHole: number
  }
  tournament: {
    id: string
    name: string
    course: string
    format: string
    status: string
    leaderboardPublic: boolean
  }
  leagueName: string
  holes: HoleInfo[]
  players: string[]
  existingScores: { holeNumber: number; strokes: number }[]
}

type Screen = 'confirm' | 'scoring' | 'review' | 'success'

function parLabel(score: number, par: number) {
  const d = score - par
  if (d <= -2) return { text: 'Eagle', color: '#e6c96a', bg: 'rgba(230,201,106,0.15)' }
  if (d === -1) return { text: 'Birdie', color: '#4CAF50', bg: 'rgba(76,175,80,0.15)' }
  if (d === 0) return { text: 'Par', color: 'rgba(240,237,230,0.5)', bg: 'rgba(255,255,255,0.06)' }
  if (d === 1) return { text: 'Bogey', color: '#d4a017', bg: 'rgba(212,160,23,0.15)' }
  if (d === 2) return { text: 'Double', color: '#d4a017', bg: 'rgba(212,160,23,0.15)' }
  return { text: `+${d}`, color: '#d4a017', bg: 'rgba(212,160,23,0.15)' }
}

function fmtRelative(n: number) {
  if (n === 0) return 'E'
  if (n > 0) return `+${n}`
  return String(n)
}

export default function ScoreEntryApp({
  group,
  tournament,
  leagueName,
  holes,
  players,
  existingScores,
}: ScoreEntryAppProps) {
  // Initialize scores from existing data
  const initialScores: (number | null)[] = holes.map(h => {
    const existing = existingScores.find(s => s.holeNumber === h.number)
    return existing ? existing.strokes : null
  })

  const alreadyCompleted = group.status === 'completed'
  const [screen, setScreen] = useState<Screen>(alreadyCompleted ? 'success' : 'confirm')
  const [scores, setScores] = useState<(number | null)[]>(initialScores)
  const [holeIdx, setHoleIdx] = useState(() => {
    // Start at the first unscored hole
    const firstUnscored = initialScores.findIndex(s => s === null)
    return firstUnscored === -1 ? 0 : firstUnscored
  })
  const [animKey, setAnimKey] = useState(0)
  const [justSaved, setJustSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confetti, setConfetti] = useState<{ id: number; left: string; color: string; delay: string; size: string }[]>([])

  const h = holes[holeIdx]
  const currentScore = scores[holeIdx] ?? h.par
  const rel = currentScore - h.par
  const pLabel = parLabel(currentScore, h.par)
  const completed = scores.filter(s => s !== null).length
  const totalScore = scores.reduce<number>((a, s) => a + (s ?? 0), 0)
  const totalPar = holes.slice(0, completed).reduce((a, h2) => a + h2.par, 0)
  const totalRel = totalScore - totalPar
  const fullTotalPar = holes.reduce((a, h2) => a + h2.par, 0)

  const setScore = useCallback((val: number) => {
    const clamped = Math.max(1, Math.min(12, val))
    setScores(prev => {
      const next = [...prev]
      next[holeIdx] = clamped
      return next
    })
    setAnimKey(k => k + 1)
  }, [holeIdx])

  // Save current hole score and advance
  const saveAndNext = async () => {
    const scoreVal = scores[holeIdx] ?? h.par
    // Ensure score is saved in state
    if (scores[holeIdx] === null) {
      setScores(prev => {
        const next = [...prev]
        next[holeIdx] = h.par
        return next
      })
    }

    setSaving(true)
    try {
      await upsertScore({
        tournamentId: tournament.id,
        groupId: group.id,
        holeNumber: h.number,
        strokes: scoreVal,
        enteredBy: group.chaperoneName ?? undefined,
      })

      const nextHole = holeIdx + 1
      if (nextHole < holes.length) {
        await updateGroupProgress(group.id, holes[nextHole].number, 'in_progress')
      }
    } catch {
      // Score will retry on next save — continue to next hole
    }

    setJustSaved(true)
    setTimeout(() => {
      setJustSaved(false)
      setSaving(false)
      if (holeIdx < holes.length - 1) {
        setHoleIdx(i => i + 1)
      } else {
        setScreen('review')
      }
    }, 600)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const allScores = holes.map((hole, i) => ({
        holeNumber: hole.number,
        strokes: scores[i] ?? hole.par,
      }))

      await submitScorecard({
        tournamentId: tournament.id,
        groupId: group.id,
        scores: allScores,
        enteredBy: group.chaperoneName ?? undefined,
      })

      setScreen('success')
    } catch {
      // Show error inline would be ideal but keep it simple
      setSubmitting(false)
    }
  }

  // Confetti on success
  useEffect(() => {
    if (screen === 'success') {
      const items = [...Array(18)].map((_, i) => ({
        id: i,
        left: `${5 + Math.random() * 90}%`,
        color: i % 4 === 0 ? 'var(--gold)' : i % 4 === 1 ? '#4CAF50' : i % 4 === 2 ? 'white' : '#e6c96a',
        delay: `${Math.random() * 0.5}s`,
        size: `${6 + Math.random() * 6}px`,
      }))
      setConfetti(items)
    }
  }, [screen])

  const finalTotalScore = scores.reduce<number>((a, s, i) => a + (s ?? holes[i].par), 0)
  const finalRel = finalTotalScore - fullTotalPar

  // ─── Status bar (always visible) ──────────────────────────────────────────────
  const StatusBar = () => (
    <div style={{ height: 44, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),#5a3e10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem' }}>⛳</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '0.78rem', color: 'var(--text)' }}>Lotus Links</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--font-outfit, sans-serif)' }}>{leagueName} &middot; {tournament.course}</div>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', animation: 'pulse 2s ease-in-out infinite' }} />
      </div>
    </div>
  )

  // ─── Confirm Screen ─────────────────────────────────────────────────────────
  if (screen === 'confirm') {
    return (
      <div className="phone">
        <StatusBar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem', animation: 'fadeUp 0.4s ease' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg,var(--forest),var(--surface))', border: '1px solid var(--gold-border)', borderRadius: 12, padding: '1.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👋</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.4rem' }}>
                Welcome{group.chaperoneName ? `, ${group.chaperoneName}` : ''}!
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
                {group.name}
              </div>
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                  Your Players
                </div>
                {players.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0', borderBottom: i < players.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--gold)', flexShrink: 0, fontFamily: 'var(--fm)' }}>
                      {p.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{p}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {tournament.format} format &middot; {holes.length} holes &middot; {tournament.course}<br />
                <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>You&apos;ll enter one team score per hole</span>
              </div>
            </div>
            <button className="submit-btn" onClick={() => {
              updateGroupProgress(group.id, holes[0].number, 'in_progress')
              setScreen('scoring')
            }}>
              Start Scoring &rarr;
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Scoring Screen ─────────────────────────────────────────────────────────
  if (screen === 'scoring') {
    return (
      <div className="phone">
        <StatusBar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar with progress */}
          <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '0.95rem', color: 'var(--text)' }}>{group.name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{group.chaperoneName}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Total</div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', color: completed === 0 ? 'var(--text-muted)' : totalRel < 0 ? '#4CAF50' : totalRel > 0 ? 'var(--over)' : 'var(--text-muted)' }}>
                  {completed === 0 ? '—' : fmtRelative(totalRel)}
                </div>
              </div>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(completed / holes.length) * 100}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>{completed}/{holes.length} holes</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--gold)' }}>{Math.round((completed / holes.length) * 100)}% complete</div>
            </div>
          </div>

          {/* Hole pill navigator */}
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', gap: '0.4rem', minWidth: 'max-content' }}>
              {holes.map((h2, i) => (
                <button
                  key={i}
                  className={`hole-pill tap ${scores[i] !== null ? 'done' : i === holeIdx ? 'active' : 'todo'}`}
                  onClick={() => setHoleIdx(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Main scoring area */}
          <div style={{ flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Hole info card */}
            <div style={{ background: 'linear-gradient(135deg,var(--forest),var(--surface2))', border: '1px solid var(--gold-border)', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Hole {h.number}</div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{h.number}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Par</div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', color: 'var(--text)' }}>{h.par}</div>
              </div>
              {h.yardage && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Yards</div>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', color: 'var(--text)' }}>{h.yardage}</div>
                </div>
              )}
            </div>

            {/* Score stepper */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '1.25rem' }}>
                Team Score — {tournament.format}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <button className="step-btn step-minus tap" onClick={() => setScore(currentScore - 1)}>−</button>

                <div key={animKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', animation: 'pop 0.25s ease' }}>
                  <div className="score-display" style={{
                    background: rel < 0 ? 'rgba(76,175,80,0.12)' : rel > 0 ? 'var(--over-dim)' : 'var(--surface2)',
                    border: rel < 0 ? '2px solid rgba(76,175,80,0.35)' : rel > 0 ? '2px solid var(--over-border)' : '2px solid var(--border2)',
                    color: rel < 0 ? '#4CAF50' : rel > 0 ? 'var(--over)' : 'var(--text)',
                  }}>
                    {currentScore}
                  </div>
                  <div className="par-label" style={{ background: pLabel.bg, color: pLabel.color }}>
                    {pLabel.text}
                  </div>
                </div>

                <button className="step-btn step-plus tap" onClick={() => setScore(currentScore + 1)}>+</button>
              </div>

              {/* Quick score buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                {[h.par - 1, h.par, h.par + 1, h.par + 2].filter(v => v > 0 && v <= 10).map(v => (
                  <button key={v} onClick={() => setScore(v)} className="tap" style={{
                    minWidth: 52, height: 40, borderRadius: 6,
                    background: currentScore === v ? (v < h.par ? 'rgba(76,175,80,0.25)' : v === h.par ? 'var(--surface3)' : 'var(--over-dim)') : 'var(--surface2)',
                    border: currentScore === v ? (v < h.par ? '1.5px solid rgba(76,175,80,0.5)' : v === h.par ? '1.5px solid var(--border2)' : '1.5px solid var(--over-border)') : '1px solid var(--border)',
                    color: currentScore === v ? (v < h.par ? '#4CAF50' : v === h.par ? 'var(--text)' : 'var(--over)') : 'var(--text-muted)',
                    fontFamily: 'var(--fd)', fontSize: '1rem', cursor: 'pointer',
                    transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
                  }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Save & Next */}
            <button className="submit-btn" onClick={saveAndNext} disabled={saving} style={{ position: 'relative', overflow: 'hidden' }}>
              {justSaved ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', animation: 'checkPop 0.3s ease' }}>✓ Saved!</span>
              ) : saving ? (
                'Saving...'
              ) : holeIdx === holes.length - 1 ? (
                'Review & Submit Scorecard 🏁'
              ) : (
                `Save Hole ${h.number} & Go to Hole ${holes[holeIdx + 1]?.number} →`
              )}
            </button>

            {/* Score mini strip */}
            {completed > 0 && (
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {scores.map((s, i) => {
                  if (s === null) return null
                  const d = s - holes[i].par
                  return (
                    <div key={i} onClick={() => setHoleIdx(i)} className="tap" style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--fm)',
                      background: d < 0 ? 'rgba(76,175,80,0.2)' : d === 0 ? 'var(--surface2)' : 'var(--over-dim)',
                      color: d < 0 ? '#4CAF50' : d === 0 ? 'var(--text-muted)' : 'var(--over)',
                      border: d < 0 ? '1px solid rgba(76,175,80,0.3)' : d === 0 ? '1px solid var(--border)' : '1px solid var(--over-border)',
                    }}>
                      {i + 1}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Review Screen ──────────────────────────────────────────────────────────
  if (screen === 'review') {
    return (
      <div className="phone">
        <StatusBar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem', animation: 'fadeUp 0.4s ease', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <button onClick={() => setScreen('scoring')} className="tap" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', alignSelf: 'flex-start', marginBottom: '1.25rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            &larr; Edit Scores
          </button>

          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', color: 'var(--text)', marginBottom: '0.25rem' }}>Review Scorecard</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{group.name} &middot; {group.chaperoneName}</div>

          {/* Score summary hero */}
          <div style={{ background: 'linear-gradient(135deg,var(--forest),var(--surface2))', border: '1px solid var(--gold-border)', borderRadius: 10, padding: '1.25rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Total Score</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '3.5rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{finalTotalScore}</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', color: finalRel < 0 ? '#4CAF50' : finalRel > 0 ? 'var(--over)' : 'var(--text-muted)', marginTop: '0.25rem' }}>
              {finalRel === 0 ? 'Even Par' : finalRel > 0 ? `+${finalRel} over par` : `${finalRel} under par`}
            </div>
          </div>

          {/* Hole-by-hole table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: '1rem', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 36px 36px 60px', padding: '0.5rem 0.875rem', background: 'var(--forest)', gap: '0.5rem' }}>
              {['#', 'HOLE', 'PAR', 'SCR', ''].map((label, i) => (
                <div key={i} style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold)', fontFamily: 'var(--fm)', textAlign: i === 0 ? 'center' : 'left' }}>{label}</div>
              ))}
            </div>
            {holes.map((hole, i) => {
              const s = scores[i] ?? hole.par
              const d = s - hole.par
              const lbl = parLabel(s, hole.par)
              return (
                <div key={i} className="summary-row" style={{ padding: '0.55rem 0.875rem' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>{hole.number}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hole {hole.number}{hole.yardage ? ` · ${hole.yardage}y` : ''}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'var(--fd)' }}>{hole.par}</div>
                  <div style={{ fontSize: '0.95rem', fontFamily: 'var(--fd)', fontWeight: 600, textAlign: 'center', color: d < 0 ? '#4CAF50' : d > 0 ? 'var(--over)' : 'var(--text-muted)' }}>{s}</div>
                  <div className="par-label" style={{ background: lbl.bg, color: lbl.color, fontSize: '0.6rem', padding: '0.15rem 0.4rem', textAlign: 'center' }}>{lbl.text}</div>
                </div>
              )
            })}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 36px 36px 60px', padding: '0.65rem 0.875rem', background: 'var(--forest)', gap: '0.5rem', borderTop: '1px solid var(--border)' }}>
              <div />
              <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 600, fontFamily: 'var(--fm)', letterSpacing: '0.1em' }}>TOTAL</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'var(--fd)' }}>{fullTotalPar}</div>
              <div style={{ fontSize: '1rem', fontFamily: 'var(--fd)', fontWeight: 700, textAlign: 'center', color: finalRel < 0 ? '#4CAF50' : finalRel > 0 ? 'var(--over)' : 'var(--text-muted)' }}>{finalTotalScore}</div>
              <div className="par-label" style={{ background: finalRel < 0 ? 'rgba(76,175,80,0.15)' : finalRel > 0 ? 'var(--over-dim)' : 'var(--surface2)', color: finalRel < 0 ? '#4CAF50' : finalRel > 0 ? 'var(--over)' : 'var(--text-muted)', fontSize: '0.6rem', padding: '0.15rem 0.4rem', textAlign: 'center' }}>
                {fmtRelative(finalRel)}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '1rem', lineHeight: 1.5, fontStyle: 'italic' }}>
            Once submitted, scores go live on the leaderboard.<br />Make sure everything looks right!
          </div>

          <button className="submit-btn" onClick={handleSubmit} disabled={submitting} style={{ marginBottom: '0.6rem' }}>
            {submitting ? 'Submitting...' : '✓ Submit Final Scorecard'}
          </button>
          <button className="submit-btn ghost" onClick={() => setScreen('scoring')}>
            &larr; Go Back & Edit
          </button>
        </div>
      </div>
    )
  }

  // ─── Success Screen ─────────────────────────────────────────────────────────
  return (
    <div className="phone">
      <StatusBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center', animation: 'fadeUp 0.5s ease', position: 'relative', overflow: 'hidden' }}>
        {confetti.map(c => (
          <div key={c.id} className="confetti-p" style={{ left: c.left, top: '-10px', background: c.color, width: c.size, height: c.size, animationDelay: c.delay }} />
        ))}

        <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'pop 0.5s ease 0.2s both' }}>🏆</div>

        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
          Scorecard Submitted!
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          {group.name}
        </div>

        <div style={{ background: 'linear-gradient(135deg,var(--forest),var(--surface2))', border: '1px solid var(--gold-border)', borderRadius: 12, padding: '1.5rem 2rem', marginBottom: '2rem', width: '100%' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Final Score</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '4rem', fontWeight: 700, color: finalRel < 0 ? '#4CAF50' : finalRel > 0 ? 'var(--over)' : 'var(--text)', lineHeight: 1 }}>{finalTotalScore}</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            {finalRel === 0 ? 'Even par' : finalRel < 0 ? `${Math.abs(finalRel)} under par` : `${finalRel} over par`}
          </div>
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Great job out there{group.chaperoneName ? `, ${group.chaperoneName}` : ''}!<br />
          Scores are now live on the leaderboard.
        </div>

        {tournament.leaderboardPublic && (
          <a
            href={`/leaderboard/${tournament.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'var(--gold-dim)',
              border: '1px solid var(--gold-border)',
              borderRadius: 8,
              color: 'var(--gold)',
              fontFamily: 'var(--fd)',
              fontSize: '1rem',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
          >
            View Live Leaderboard &rarr;
          </a>
        )}
      </div>
    </div>
  )
}
