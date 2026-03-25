'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { computeCourseHandicap, getStrokesOnHole, netHoleScore } from '@/lib/scoring/handicap'
import { computeStablefordPoints, type StablefordPointsConfig } from '@/lib/scoring/stableford'
import PoweredByFooter from '@/components/ui/PoweredByFooter'
import LeagueLogo from '@/components/ui/LeagueLogo'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TournamentInfo {
  id: string
  name: string
  date: string
  course: string
  format: string
  holeCount: number
  status: string
  slopeRating: number
  courseRating: number | null
  stablefordConfig: StablefordPointsConfig
}

interface HoleInfo {
  number: number
  par: number
  strokeIndex?: number | null
}

interface DivisionInfo {
  id: string
  name: string
  description: string | null
  displayOrder: number
}

interface GroupInfo {
  id: string
  name: string
  chaperoneName: string | null
  currentHole: number
  status: string
  players?: string[]
  divisionId?: string | null
}

interface PlayerInfo {
  id: string
  name: string
  handicap: number
  handicapIndex: number | null
}

interface GroupScoreData {
  groupId: string
  holeNumber: number
  strokes: number
}

interface PlayerScoreData {
  playerId: string
  holeNumber: number
  strokes: number
}

interface LiveLeaderboardProps {
  tournament: TournamentInfo
  leagueName: string
  leagueColor?: string
  leagueLogoUrl?: string | null
  holes: HoleInfo[]
  groups: GroupInfo[]
  initialScores: GroupScoreData[]
  players: PlayerInfo[]
  initialPlayerScores: PlayerScoreData[]
  divisions?: DivisionInfo[]
  resultsPublished?: boolean
  initialDivisionId?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRelative(n: number) {
  if (n === 0) return 'E'
  if (n > 0) return `+${n}`
  return String(n)
}

function resolveHandicap(player: PlayerInfo, tournament: TournamentInfo, totalPar: number): number {
  if (player.handicapIndex != null) {
    return computeCourseHandicap(
      player.handicapIndex,
      tournament.slopeRating,
      tournament.courseRating ?? totalPar,
      totalPar
    )
  }
  return player.handicap
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LiveLeaderboard({
  tournament,
  leagueName,
  leagueColor,
  leagueLogoUrl,
  holes,
  groups,
  initialScores,
  players,
  initialPlayerScores,
  divisions = [],
  resultsPublished = false,
  initialDivisionId = null,
}: LiveLeaderboardProps) {
  const router = useRouter()
  const [groupScores, setGroupScores] = useState(initialScores)
  const [playerScores, setPlayerScores] = useState(initialPlayerScores)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const isCompleted = tournament.status === 'completed'
  const isFinal = resultsPublished || isCompleted
  const [showConfetti, setShowConfetti] = useState(false)
  const confettiShown = useRef(false)
  const [useGross, setUseGross] = useState(false)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(initialDivisionId)

  const isStableford = tournament.format === 'Stableford'
  const isIndividual = tournament.format === 'Stableford' || tournament.format === 'Stroke Play'

  const totalPar = useMemo(() => holes.reduce((a, h) => a + h.par, 0), [holes])

  // Subscribe to Realtime score changes
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
            const row = payload.new as { group_id: string | null; player_id: string | null; hole_number: number; strokes: number }
            if (row.player_id) {
              setPlayerScores(prev => {
                const filtered = prev.filter(s => !(s.playerId === row.player_id && s.holeNumber === row.hole_number))
                return [...filtered, { playerId: row.player_id!, holeNumber: row.hole_number, strokes: row.strokes }]
              })
            } else if (row.group_id) {
              setGroupScores(prev => {
                const filtered = prev.filter(s => !(s.groupId === row.group_id && s.holeNumber === row.hole_number))
                return [...filtered, { groupId: row.group_id!, holeNumber: row.hole_number, strokes: row.strokes }]
              })
            }
            setLastUpdate(new Date())
          }
          if (payload.eventType === 'DELETE') {
            const row = payload.old as { group_id: string | null; player_id: string | null; hole_number: number }
            if (row.player_id) {
              setPlayerScores(prev => prev.filter(s => !(s.playerId === row.player_id && s.holeNumber === row.hole_number)))
            } else if (row.group_id) {
              setGroupScores(prev => prev.filter(s => !(s.groupId === row.group_id && s.holeNumber === row.hole_number)))
            }
            setLastUpdate(new Date())
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tournament.id, isCompleted])

  // Fallback polling every 15s
  const fetchScores = useCallback(async () => {
    const supabase = createClient()
    if (isIndividual) {
      const { data } = await supabase
        .from('scores')
        .select('player_id, hole_number, strokes')
        .eq('tournament_id', tournament.id)
        .not('player_id', 'is', null)
      if (data) {
        setPlayerScores(data.map(s => ({ playerId: s.player_id!, holeNumber: s.hole_number, strokes: s.strokes })))
        setLastUpdate(new Date())
      }
    } else {
      const { data } = await supabase
        .from('scores')
        .select('group_id, hole_number, strokes')
        .eq('tournament_id', tournament.id)
      if (data) {
        setGroupScores(data.map(s => ({ groupId: s.group_id, holeNumber: s.hole_number, strokes: s.strokes })))
        setLastUpdate(new Date())
      }
    }
  }, [tournament.id, isIndividual])

  useEffect(() => {
    if (isCompleted) return
    const interval = setInterval(fetchScores, 15000)
    return () => clearInterval(interval)
  }, [fetchScores, isCompleted])

  // Division tab selection — update URL state
  const handleSelectDivision = useCallback((divId: string | null) => {
    setSelectedDivisionId(divId)
    const url = new URL(window.location.href)
    if (divId) {
      url.searchParams.set('division', divId)
    } else {
      url.searchParams.delete('division')
    }
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  // Confetti on completed
  useEffect(() => {
    if (isCompleted && !confettiShown.current) {
      confettiShown.current = true
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }, [isCompleted])

  // ─── Build group leaderboard ───────────────────────────────────────────────

  const groupLeaderboard = useMemo(() => {
    if (isIndividual) return []
    return groups.map(g => {
      const gScores = groupScores.filter(s => s.groupId === g.id)
      const totalStrokes = gScores.reduce((a, s) => a + s.strokes, 0)
      const holesCompleted = gScores.length
      const parForCompleted = gScores.reduce((a, s) => {
        const hole = holes.find(h => h.number === s.holeNumber)
        return a + (hole?.par ?? 3)
      }, 0)
      const scoreToPar = totalStrokes - parForCompleted
      return { ...g, totalStrokes, holesCompleted, scoreToPar }
    })
      .filter(g => g.holesCompleted > 0 || g.status === 'in_progress')
      .sort((a, b) => {
        if (a.scoreToPar !== b.scoreToPar) return a.scoreToPar - b.scoreToPar
        return b.holesCompleted - a.holesCompleted
      })
  }, [groups, groupScores, holes, isIndividual])

  // ─── Build individual player leaderboard ──────────────────────────────────

  const playerLeaderboard = useMemo(() => {
    if (!isIndividual) return []
    return players.map(p => {
      const pScores = playerScores.filter(s => s.playerId === p.id)
      const pCourseHcp = resolveHandicap(p, tournament, totalPar)
      let netPts = 0
      let grossPts = 0
      let totalGross = 0
      let totalNet = 0
      let parForCompleted = 0

      pScores.forEach(s => {
        const hole = holes.find(h => h.number === s.holeNumber)
        if (!hole) return
        const received = getStrokesOnHole(pCourseHcp, hole.strokeIndex ?? null, holes.length)
        totalGross += s.strokes
        totalNet += netHoleScore(s.strokes, hole.par, received)
        parForCompleted += hole.par
        netPts += computeStablefordPoints(s.strokes, hole.par, received, tournament.stablefordConfig)
        grossPts += computeStablefordPoints(s.strokes, hole.par, 0, tournament.stablefordConfig)
      })

      const netRelative = totalNet - parForCompleted
      const grossRelative = totalGross - parForCompleted
      const totalPts = useGross ? grossPts : netPts

      return {
        ...p,
        totalPts,
        netPts,
        grossPts,
        totalGross,
        totalNet,
        netRelative,
        grossRelative,
        holesCompleted: pScores.length,
      }
    })
      .filter(p => p.holesCompleted > 0)
      .sort((a, b) => {
        if (isStableford) {
          if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts
          return b.holesCompleted - a.holesCompleted
        }
        // Stroke Play: sort by net or gross relative to par
        const aScore = useGross ? a.grossRelative : a.netRelative
        const bScore = useGross ? b.grossRelative : b.netRelative
        if (aScore !== bScore) return aScore - bScore
        return b.holesCompleted - a.holesCompleted
      })
  }, [players, playerScores, holes, tournament, totalPar, isIndividual, isStableford, useGross])

  // Filter group leaderboard by selected division (if any)
  const filteredGroupLeaderboard = useMemo(() => {
    if (!selectedDivisionId || isIndividual) return groupLeaderboard
    return groupLeaderboard.filter(g => g.divisionId === selectedDivisionId)
  }, [groupLeaderboard, selectedDivisionId, isIndividual])

  const displayedGroupLeaderboard = filteredGroupLeaderboard

  const selectedDivision = divisions.find(d => d.id === selectedDivisionId) ?? null

  // Per-division winners (for celebration view)
  const divisionWinners = useMemo(() => {
    return divisions.map(div => {
      const divGroups = groupLeaderboard.filter(g => g.divisionId === div.id)
      return { division: div, winner: divGroups[0] ?? null }
    }).filter(dw => dw.winner !== null)
  }, [divisions, groupLeaderboard])

  const notStartedGroups = groups.filter(g => {
    const hasScores = groupScores.some(s => s.groupId === g.id)
    return !hasScores && g.status !== 'in_progress'
  })

  const isLive = !isCompleted && (
    isIndividual
      ? playerLeaderboard.some(p => p.holesCompleted > 0 && p.holesCompleted < holes.length)
      : groupLeaderboard.some(g => g.status === 'in_progress' || (g.holesCompleted > 0 && g.holesCompleted < holes.length))
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

  const leaderboardEmpty = isIndividual ? playerLeaderboard.length === 0 : displayedGroupLeaderboard.length === 0
  const topEntry = isIndividual ? playerLeaderboard[0] : displayedGroupLeaderboard[0]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflow: 'hidden', ...accentStyle }}>
      {showConfetti && confettiItems.map(c => (
        <div key={c.id} className="confetti-p" style={{ left: c.left, top: '-10px', background: c.color, width: c.size, height: c.size, animationDelay: c.delay, position: 'fixed', zIndex: 50 }} />
      ))}

      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(180deg, var(--forest) 0%, var(--bg) 100%)',
          padding: '2rem 1.25rem 1.5rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -30, right: -30, fontSize: '10rem', opacity: 0.03, pointerEvents: 'none' }}>🏆</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), #5a3e10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>⛳</div>
          <span style={{ fontFamily: 'var(--fd)', fontSize: '0.9rem', color: 'var(--gold)' }}>Lotus Links</span>
        </div>

        {leagueName && (
          <div className="section-tag" style={{ marginBottom: '0.35rem' }}>{leagueName}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.875rem' }}>
          <LeagueLogo logoUrl={leagueLogoUrl} leagueName={leagueName} />
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 400, color: 'var(--text)', marginBottom: '0.35rem', lineHeight: 1.15 }}>
            {tournament.name}
          </h1>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          {formattedDate} &middot; {tournament.course} &middot; Par {totalPar}
          {isIndividual && <span style={{ marginLeft: '0.4rem' }}>· {tournament.format}</span>}
        </div>

        {selectedDivision && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontFamily: 'var(--fd)' }}>
            {selectedDivision.name}{selectedDivision.description ? ` — ${selectedDivision.description}` : ''}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isFinal ? (
            <span className="badge badge-gold" style={{ fontSize: '0.7rem', padding: '0.3rem 0.75rem', letterSpacing: '0.1em' }}>
              FINAL
            </span>
          ) : isLive ? (
            <span className="badge badge-green pulse" style={{ fontSize: '0.65rem' }}>LIVE</span>
          ) : null}

          {!isFinal && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
              Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Division filter tabs */}
        {!isIndividual && divisions.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.4rem', justifyContent: 'center', overflowX: 'auto', paddingBottom: '0.25rem', WebkitOverflowScrolling: 'touch' }}>
            <button
              onClick={() => handleSelectDivision(null)}
              style={{
                flexShrink: 0,
                padding: '0.4rem 0.9rem',
                borderRadius: 999,
                border: `1px solid ${selectedDivisionId === null ? 'var(--gold)' : 'var(--border2)'}`,
                background: selectedDivisionId === null ? 'var(--gold)' : 'var(--forest)',
                color: selectedDivisionId === null ? '#0a120a' : 'var(--text-muted)',
                fontFamily: 'var(--fm)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Overall
            </button>
            {divisions.map(div => (
              <button
                key={div.id}
                onClick={() => handleSelectDivision(div.id)}
                style={{
                  flexShrink: 0,
                  padding: '0.4rem 0.9rem',
                  borderRadius: 999,
                  border: `1px solid ${selectedDivisionId === div.id ? 'var(--gold)' : 'var(--border2)'}`,
                  background: selectedDivisionId === div.id ? 'var(--gold)' : 'var(--forest)',
                  color: selectedDivisionId === div.id ? '#0a120a' : 'var(--text-muted)',
                  fontFamily: 'var(--fm)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s, border-color 0.15s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {div.name}
              </button>
            ))}
          </div>
        )}

        {isIndividual && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', padding: '0 1.25rem' }}>
            <div style={{ display: 'flex', borderRadius: 20, border: '1px solid var(--gold-border)', overflow: 'hidden', height: 44, width: '100%', maxWidth: 340 }}>
              <button
                onClick={() => setUseGross(false)}
                style={{ flex: 1, height: '100%', fontFamily: 'var(--fm)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: !useGross ? 'var(--gold)' : 'transparent', color: !useGross ? '#0a120a' : 'var(--gold)', WebkitTapHighlightColor: 'transparent', transition: 'background 0.15s, color 0.15s' }}
              >
                Net (Handicap)
              </button>
              <button
                onClick={() => setUseGross(true)}
                style={{ flex: 1, height: '100%', fontFamily: 'var(--fm)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none', borderLeft: '1px solid var(--gold-border)', background: useGross ? 'var(--gold)' : 'transparent', color: useGross ? '#0a120a' : 'var(--gold)', WebkitTapHighlightColor: 'transparent', transition: 'background 0.15s, color 0.15s' }}
              >
                Gross
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard table */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 1rem 3rem' }}>

        {/* Winner highlight */}
        {isCompleted && topEntry && (
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
              {(topEntry as any).name}
            </div>
            {isStableford ? (
              <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 600, color: 'var(--gold)' }}>
                {(topEntry as any).totalPts} pts
              </div>
            ) : isIndividual ? (() => {
              const champ = topEntry as any
              const displayScore = useGross ? champ.grossRelative : champ.netRelative
              return (
                <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 600, color: displayScore < 0 ? '#4CAF50' : displayScore > 0 ? 'var(--over)' : 'var(--text-muted)' }}>
                  {fmtRelative(displayScore)}
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', marginLeft: '0.3rem' }}>{useGross ? 'gross' : 'net'}</span>
                </div>
              )
            })() : (
              <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 600, color: (topEntry as any).scoreToPar < 0 ? '#4CAF50' : (topEntry as any).scoreToPar > 0 ? 'var(--over)' : 'var(--text-muted)' }}>
                {fmtRelative((topEntry as any).scoreToPar)}
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', marginTop: '0.15rem' }}>
              {isIndividual
                ? `${(topEntry as any).totalGross} gross · ${(topEntry as any).holesCompleted}/${holes.length} holes`
                : `${(topEntry as any).totalStrokes} strokes · ${(topEntry as any).holesCompleted}/${holes.length} holes`}
            </div>
          </div>
        )}

        {/* Celebration / podium section — shown when results published */}
        {resultsPublished && !isIndividual && displayedGroupLeaderboard.length > 0 && (
          <div style={{ marginBottom: '2rem', animation: 'fadeUp 0.5s ease' }}>
            {/* Champion card — uses the filtered leaderboard's #1 */}
            {displayedGroupLeaderboard[0] && (() => {
              const champ = displayedGroupLeaderboard[0]
              const isOverall = selectedDivisionId === null
              const champLabel = isOverall
                ? 'Overall Champion'
                : `${selectedDivision?.name ?? 'Division'} Champion`
              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(200,168,75,0.18), rgba(200,168,75,0.06))',
                  border: '2px solid var(--gold-border)',
                  borderRadius: 16,
                  padding: '1.75rem 1.5rem',
                  textAlign: 'center',
                  marginBottom: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(200,168,75,0.12), transparent 60%)', pointerEvents: 'none' }} />
                  <div style={{ fontSize: '2.75rem', marginBottom: '0.5rem', animation: 'pop 0.5s ease 0.1s both' }}>🏆</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'var(--fm)', marginBottom: '0.4rem' }}>{champLabel}</div>
                  {!isOverall && selectedDivision?.description && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{selectedDivision.description}</div>
                  )}
                  <div style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.4rem, 4vw, 1.9rem)', color: 'var(--text)', marginBottom: '0.35rem', fontWeight: 400 }}>
                    {champ.name}
                  </div>
                  {champ.players && champ.players.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
                      {champ.players.map((name, i) => (
                        <span key={i} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.15rem 0.4rem', fontFamily: 'var(--fm)' }}>{name}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 600, color: champ.scoreToPar < 0 ? '#4CAF50' : champ.scoreToPar > 0 ? 'var(--over)' : 'var(--text-muted)' }}>
                    {fmtRelative(champ.scoreToPar)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', marginTop: '0.15rem' }}>
                    {champ.totalStrokes} strokes &middot; {champ.holesCompleted}/{holes.length} holes
                  </div>
                </div>
              )
            })()}

            {/* Division winners — only on Overall tab */}
            {selectedDivisionId === null && divisionWinners.length > 0 && (
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'var(--fm)', textAlign: 'center', marginBottom: '0.75rem' }}>
                  Division Champions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {divisionWinners.map(({ division, winner }) => winner && (
                    <div key={division.id} style={{
                      background: 'linear-gradient(90deg, rgba(200,168,75,0.08), transparent)',
                      border: '1px solid var(--gold-border)',
                      borderRadius: 10,
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}>
                      <div style={{ fontSize: '1.4rem' }}>🥇</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--fm)', marginBottom: '0.15rem' }}>
                          {division.name}{division.description ? ` — ${division.description}` : ''}
                        </div>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', color: 'var(--text)' }}>{winner.name}</div>
                        {winner.players && winner.players.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.2rem' }}>
                            {winner.players.map((name, i) => (
                              <span key={i} style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>{i > 0 ? '· ' : ''}{name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 600, color: winner.scoreToPar < 0 ? '#4CAF50' : winner.scoreToPar > 0 ? 'var(--over)' : 'var(--text-muted)' }}>
                          {fmtRelative(winner.scoreToPar)}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                          {winner.holesCompleted}/{holes.length} holes
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ height: '1px', background: 'var(--border)', margin: '1.5rem 0' }} />
          </div>
        )}

        {leaderboardEmpty ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏌️</div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Waiting for Scores</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Scores will appear here as {isIndividual ? 'players submit' : 'groups submit'}. Check back soon!
            </p>
          </div>
        ) : isIndividual ? (
          /* ─── Individual player leaderboard ─────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.25rem 0.75rem' }}>
              {useGross ? 'Gross Leaderboard (No Handicap)' : 'Net Leaderboard (Handicap Adjusted)'}
            </div>
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
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-dim)', fontFamily: 'var(--fm)', textTransform: 'uppercase' }}>Player</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-dim)', fontFamily: 'var(--fm)', textTransform: 'uppercase', textAlign: 'center' }}>Thru</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--text-dim)', fontFamily: 'var(--fm)', textTransform: 'uppercase', textAlign: 'right' }}>
                {isStableford ? 'Pts' : useGross ? 'Gross' : 'Net'}
              </div>
            </div>

            {playerLeaderboard.map((entry, i) => {
              const isLeader = i === 0
              const isTop3 = i < 3
              const isFinished = entry.holesCompleted === holes.length
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
                  <div className={`pos-badge ${posBadgeClass}`}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: isLeader ? 600 : 400 }}>
                      {entry.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                      HCP {entry.handicapIndex ?? entry.handicap}
                      {!isStableford && !useGross && ` · gross ${entry.totalGross}`}
                      {!isStableford && useGross && ` · net ${fmtRelative(entry.netRelative)}`}
                      {isStableford && useGross && entry.netPts !== entry.grossPts && <span style={{ marginLeft: '0.3rem' }}>· {entry.netPts} net</span>}
                      {isStableford && !useGross && entry.netPts !== entry.grossPts && <span style={{ marginLeft: '0.3rem' }}>· {entry.grossPts} gross</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {isFinished ? (
                      <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>F</span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                        {entry.holesCompleted}/{holes.length}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isStableford ? (
                      <>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 600, color: isLeader ? 'var(--gold)' : 'var(--text)' }}>
                          {entry.totalPts}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>pts</div>
                      </>
                    ) : (() => {
                      const displayScore = useGross ? entry.grossRelative : entry.netRelative
                      return (
                        <>
                          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 600, color: displayScore < 0 ? '#4CAF50' : displayScore > 0 ? 'var(--over)' : 'var(--text-muted)' }}>
                            {fmtRelative(displayScore)}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>{useGross ? 'gross' : 'net'}</div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ─── Group (scramble) leaderboard ──────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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

            {displayedGroupLeaderboard.map((entry, i) => {
              const isLeader = i === 0
              const isTop3 = i < 3
              const isFinished = entry.holesCompleted === holes.length
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
                  <div className={`pos-badge ${posBadgeClass}`}>{i + 1}</div>
                  <div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: isLeader ? 600 : 400 }}>
                      {entry.name}
                    </div>
                    {entry.players && entry.players.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
                        {entry.players.map((name, pi) => (
                          <span key={pi} style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.1rem 0.35rem', fontFamily: 'var(--fm)', lineHeight: 1.4 }}>
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                    {!entry.players?.length && entry.chaperoneName && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                        {entry.chaperoneName}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {isFinished ? (
                      <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>F</span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                        {entry.holesCompleted}/{holes.length}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 600, color: entry.scoreToPar < 0 ? '#4CAF50' : entry.scoreToPar > 0 ? 'var(--over)' : 'var(--text-muted)' }}>
                      {fmtRelative(entry.scoreToPar)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Not started groups */}
        {!isIndividual && notStartedGroups.length > 0 && displayedGroupLeaderboard.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <div className="label" style={{ marginBottom: '0.5rem' }}>
              {isCompleted ? 'Did Not Start' : 'Not Yet Started'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {notStartedGroups.map(g => (
                <span key={g.id} className="badge badge-gray">{g.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          {!isFinal && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>Auto-refreshes every 15 seconds</div>
          )}
          <PoweredByFooter />
        </div>
      </div>
    </div>
  )
}
