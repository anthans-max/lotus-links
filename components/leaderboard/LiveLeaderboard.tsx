'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import PoweredByFooter from '@/components/ui/PoweredByFooter'

interface TournamentInfo {
  id: string
  name: string
  date: string
  course: string
  format: string
  holeCount: number
  status: string
}

interface HoleInfo {
  number: number
  par: number
}

interface GroupInfo {
  id: string
  name: string
  chaperoneName: string | null
  currentHole: number
  status: string
}

interface ScoreData {
  groupId: string
  holeNumber: number
  strokes: number
}

interface LiveLeaderboardProps {
  tournament: TournamentInfo
  leagueName: string
  leagueColor?: string
  holes: HoleInfo[]
  groups: GroupInfo[]
  initialScores: ScoreData[]
}

function fmtRelative(n: number) {
  if (n === 0) return 'E'
  if (n > 0) return `+${n}`
  return String(n)
}

export default function LiveLeaderboard({
  tournament,
  leagueName,
  leagueColor,
  holes,
  groups,
  initialScores,
}: LiveLeaderboardProps) {
  const [scores, setScores] = useState(initialScores)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const isCompleted = tournament.status === 'completed'
  const [showConfetti, setShowConfetti] = useState(false)
  const confettiShown = useRef(false)

  const totalPar = holes.reduce((a, h) => a + h.par, 0)

  // Subscribe to Realtime score changes (only if not completed)
  useEffect(() => {
    if (isCompleted) return

    const supabase = createClient()

    const channel = supabase
      .channel('leaderboard-scores')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as { group_id: string; hole_number: number; strokes: number }
            setScores(prev => {
              const filtered = prev.filter(
                s => !(s.groupId === row.group_id && s.holeNumber === row.hole_number)
              )
              return [...filtered, { groupId: row.group_id, holeNumber: row.hole_number, strokes: row.strokes }]
            })
            setLastUpdate(new Date())
          }
          if (payload.eventType === 'DELETE') {
            const row = payload.old as { group_id: string; hole_number: number }
            setScores(prev =>
              prev.filter(s => !(s.groupId === row.group_id && s.holeNumber === row.hole_number))
            )
            setLastUpdate(new Date())
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournament.id, isCompleted])

  // Fallback polling every 15s (only if not completed)
  const fetchScores = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('scores')
      .select('group_id, hole_number, strokes')
      .eq('tournament_id', tournament.id)

    if (data) {
      setScores(data.map(s => ({ groupId: s.group_id, holeNumber: s.hole_number, strokes: s.strokes })))
      setLastUpdate(new Date())
    }
  }, [tournament.id])

  useEffect(() => {
    if (isCompleted) return
    const interval = setInterval(fetchScores, 15000)
    return () => clearInterval(interval)
  }, [fetchScores, isCompleted])

  // Show confetti on completed tournament (once)
  useEffect(() => {
    if (isCompleted && !confettiShown.current) {
      confettiShown.current = true
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }, [isCompleted])

  // Build leaderboard data
  const leaderboard = useMemo(() => {
    return groups.map(g => {
      const groupScores = scores.filter(s => s.groupId === g.id)
      const totalStrokes = groupScores.reduce((a, s) => a + s.strokes, 0)
      const holesCompleted = groupScores.length
      const parForCompleted = groupScores.reduce((a, s) => {
        const hole = holes.find(h => h.number === s.holeNumber)
        return a + (hole?.par ?? 3)
      }, 0)
      const scoreToPar = totalStrokes - parForCompleted

      return {
        ...g,
        totalStrokes,
        holesCompleted,
        scoreToPar,
      }
    })
      .filter(g => g.holesCompleted > 0 || g.status === 'in_progress')
      .sort((a, b) => {
        if (a.scoreToPar !== b.scoreToPar) return a.scoreToPar - b.scoreToPar
        return b.holesCompleted - a.holesCompleted
      })
  }, [groups, scores, holes])

  const notStarted = groups.filter(g => {
    const hasScores = scores.some(s => s.groupId === g.id)
    return !hasScores && g.status !== 'in_progress'
  })

  const isLive = !isCompleted && leaderboard.some(g =>
    g.status === 'in_progress' || (g.holesCompleted > 0 && g.holesCompleted < holes.length)
  )

  const formattedDate = (() => {
    try {
      return new Date(tournament.date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return tournament.date
    }
  })()

  // Confetti items
  const confettiItems = useMemo(() => {
    if (!isCompleted) return []
    return [...Array(24)].map((_, i) => ({
      id: i,
      left: `${3 + Math.random() * 94}%`,
      color: i % 5 === 0 ? 'var(--gold)' : i % 5 === 1 ? '#4CAF50' : i % 5 === 2 ? 'white' : i % 5 === 3 ? '#e6c96a' : 'var(--gold-light)',
      delay: `${Math.random() * 0.8}s`,
      size: `${5 + Math.random() * 7}px`,
    }))
  }, [isCompleted])

  const accentStyle = leagueColor ? ({ '--league-accent': leagueColor, '--league-accent-dim': `color-mix(in srgb, ${leagueColor} 15%, transparent)`, '--league-accent-border': `color-mix(in srgb, ${leagueColor} 25%, transparent)` } as React.CSSProperties) : {}

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden', ...accentStyle }}>
      {/* Confetti for completed tournament */}
      {showConfetti && confettiItems.map(c => (
        <div key={c.id} className="confetti-p" style={{ left: c.left, top: '-10px', background: c.color, width: c.size, height: c.size, animationDelay: c.delay, position: 'fixed', zIndex: 50 }} />
      ))}

      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, var(--forest) 0%, var(--bg) 100%)',
        padding: '2rem 1.25rem 1.5rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, fontSize: '10rem', opacity: 0.03, pointerEvents: 'none' }}>🏆</div>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), #5a3e10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>⛳</div>
          <span style={{ fontFamily: 'var(--fd)', fontSize: '0.9rem', color: 'var(--gold)' }}>Lotus Links</span>
        </div>

        {leagueName && (
          <div className="section-tag" style={{ marginBottom: '0.35rem' }}>{leagueName}</div>
        )}
        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 400, color: 'var(--text)', marginBottom: '0.35rem', lineHeight: 1.15 }}>
          {tournament.name}
        </h1>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          {formattedDate} &middot; {tournament.course} &middot; Par {totalPar}
        </div>

        {/* Status indicators */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isCompleted ? (
            <span className="badge badge-gold" style={{ fontSize: '0.7rem', padding: '0.3rem 0.75rem', letterSpacing: '0.1em' }}>
              FINAL RESULTS
            </span>
          ) : isLive ? (
            <span className="badge badge-green pulse" style={{ fontSize: '0.65rem' }}>LIVE</span>
          ) : null}

          {!isCompleted && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
              Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Leaderboard table */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 1rem 3rem' }}>
        {/* Winner highlight for completed tournament */}
        {isCompleted && leaderboard.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(200,168,75,0.12), rgba(200,168,75,0.04))',
            border: '1px solid var(--gold-border)',
            borderRadius: 12,
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
            animation: 'fadeUp 0.5s ease',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', animation: 'pop 0.5s ease 0.2s both' }}>🏆</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.3rem', fontFamily: 'var(--fm)' }}>Champion</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
              {leaderboard[0].name}
            </div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 600, color: leaderboard[0].scoreToPar < 0 ? '#4CAF50' : leaderboard[0].scoreToPar > 0 ? 'var(--over)' : 'var(--text-muted)' }}>
              {fmtRelative(leaderboard[0].scoreToPar)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', marginTop: '0.15rem' }}>
              {leaderboard[0].totalStrokes} strokes &middot; {leaderboard[0].holesCompleted}/{holes.length} holes
            </div>
          </div>
        )}

        {leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏌️</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Waiting for Scores</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Scores will appear here as groups submit them. Check back soon!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 60px 70px',
              alignItems: 'center',
              padding: '0.5rem 0.75rem',
              gap: '0.5rem',
              position: 'sticky',
              top: 0,
              background: 'var(--bg)',
              zIndex: 10,
            }}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-dim)', fontFamily: 'var(--fm)', textTransform: 'uppercase' }}>Pos</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-dim)', fontFamily: 'var(--fm)', textTransform: 'uppercase' }}>Group</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-dim)', fontFamily: 'var(--fm)', textTransform: 'uppercase', textAlign: 'center' }}>Thru</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-dim)', fontFamily: 'var(--fm)', textTransform: 'uppercase', textAlign: 'right' }}>Score</div>
            </div>

            {leaderboard.map((entry, i) => {
              const isLeader = i === 0
              const isTop3 = i < 3
              const isFinished = entry.holesCompleted === holes.length

              // Position badge color
              const posBadgeClass = i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : 'pos-n'

              return (
                <div
                  key={entry.id}
                  className={`lb-row ${isLeader ? 'leader' : ''}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr 60px 70px',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: 4,
                    background: isLeader
                      ? 'linear-gradient(90deg,rgba(200,168,75,0.08),transparent)'
                      : isCompleted && isTop3
                        ? 'linear-gradient(90deg,rgba(200,168,75,0.04),transparent)'
                        : 'var(--surface)',
                    border: `1px solid ${isLeader ? 'var(--gold-border)' : isCompleted && isTop3 ? 'var(--gold-border)' : 'var(--border)'}`,
                    animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {/* Position */}
                  <div className={`pos-badge ${posBadgeClass}`}>
                    {i + 1}
                  </div>

                  {/* Group info */}
                  <div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: isLeader ? 600 : 400 }}>
                      {entry.name}
                    </div>
                    {entry.chaperoneName && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                        {entry.chaperoneName}
                      </div>
                    )}
                  </div>

                  {/* Holes progress */}
                  <div style={{ textAlign: 'center' }}>
                    {isFinished ? (
                      <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>F</span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                        {entry.holesCompleted}/{holes.length}
                      </span>
                    )}
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'var(--fd)',
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: entry.scoreToPar < 0 ? '#4CAF50' : entry.scoreToPar > 0 ? 'var(--over)' : 'var(--text-muted)',
                    }}>
                      {fmtRelative(entry.scoreToPar)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                      {entry.totalStrokes}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Not started section */}
        {notStarted.length > 0 && leaderboard.length > 0 && !isCompleted && (
          <div style={{ marginTop: '1.5rem' }}>
            <div className="label" style={{ marginBottom: '0.5rem' }}>Not Yet Started</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {notStarted.map(g => (
                <span key={g.id} className="badge badge-gray">{g.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Groups with no scores on completed tournament */}
        {notStarted.length > 0 && isCompleted && (
          <div style={{ marginTop: '1.5rem' }}>
            <div className="label" style={{ marginBottom: '0.5rem' }}>Did Not Start</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {notStarted.map(g => (
                <span key={g.id} className="badge badge-gray">{g.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          {!isCompleted && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>Auto-refreshes every 15 seconds</div>
          )}
          <PoweredByFooter />
        </div>
      </div>
    </div>
  )
}
