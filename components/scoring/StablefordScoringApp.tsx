'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeCourseHandicap, getStrokesOnHole } from '@/lib/scoring/handicap'
import { computeStablefordPoints, DEFAULT_STABLEFORD_CONFIG, type StablefordPointsConfig } from '@/lib/scoring/stableford'
import PoweredByFooter from '@/components/ui/PoweredByFooter'

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
  yardage: number | null
  handicap: number | null  // stroke index
}

interface PlayerInfo {
  id: string
  name: string
  handicap: number          // legacy integer (Course Handicap fallback)
  handicapIndex: number | null  // USGA Handicap Index
}

interface ScoreEntry {
  playerId: string
  holeNumber: number
  strokes: number
}

interface Props {
  tournament: TournamentInfo
  leagueName: string
  leagueColor?: string
  holes: HoleInfo[]
  players: PlayerInfo[]
  initialScores: ScoreEntry[]
  tournamentId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPoints(pts: number) {
  return pts === 1 ? '1 pt' : `${pts} pts`
}

function fmtRelative(n: number) {
  if (n === 0) return 'E'
  if (n > 0) return `+${n}`
  return String(n)
}

/** Compute a player's Course Handicap given tournament settings. */
function resolveHandicap(player: PlayerInfo, tournament: TournamentInfo, totalPar: number): number {
  if (player.handicapIndex != null) {
    return computeCourseHandicap(
      player.handicapIndex,
      tournament.slopeRating,
      tournament.courseRating ?? totalPar,
      totalPar
    )
  }
  // Fall back to legacy integer handicap
  return player.handicap
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StablefordScoringApp({
  tournament,
  leagueName,
  leagueColor,
  holes,
  players,
  initialScores,
  tournamentId,
}: Props) {
  const accentStyle = leagueColor
    ? ({ '--league-accent': leagueColor, '--league-accent-dim': `color-mix(in srgb, ${leagueColor} 15%, transparent)`, '--league-accent-border': `color-mix(in srgb, ${leagueColor} 25%, transparent)` } as React.CSSProperties)
    : {}

  const supabase = useMemo(() => createClient(), [])

  const isStableford = tournament.format === 'Stableford'
  const isStrokePlay = tournament.format === 'Stroke Play'

  const totalPar = useMemo(() => holes.reduce((a, h) => a + h.par, 0), [holes])

  const [phase, setPhase] = useState<'pick' | 'score'>('pick')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null)
  const [search, setSearch] = useState('')

  // localScores: hole_number → gross strokes (undefined = not entered)
  const [localScores, setLocalScores] = useState<Record<number, number>>({})

  // All submitted scores across all players (for leaderboard)
  const [allScores, setAllScores] = useState<ScoreEntry[]>(initialScores)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedHoles, setSavedHoles] = useState<Set<number>>(new Set())

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

  // ─── Course Handicap (cached per selected player) ─────────────────────────
  const selectedCourseHandicap = useMemo(() => {
    if (!selectedPlayer) return 0
    return resolveHandicap(selectedPlayer, tournament, totalPar)
  }, [selectedPlayer, tournament, totalPar])

  const hasNoHandicap = selectedPlayer != null && selectedPlayer.handicapIndex == null && selectedPlayer.handicap === 0

  // ─── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`stableford-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as {
              player_id: string | null
              hole_number: number
              strokes: number
            }
            if (!row.player_id) return
            setAllScores(prev => {
              const filtered = prev.filter(
                s => !(s.playerId === row.player_id && s.holeNumber === row.hole_number)
              )
              return [
                ...filtered,
                { playerId: row.player_id!, holeNumber: row.hole_number, strokes: row.strokes },
              ]
            })
          }
          if (payload.eventType === 'DELETE') {
            const row = payload.old as { player_id: string | null; hole_number: number }
            if (!row.player_id) return
            setAllScores(prev =>
              prev.filter(
                s => !(s.playerId === row.player_id && s.holeNumber === row.hole_number)
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, tournamentId])

  // ─── Player selection ─────────────────────────────────────────────────────

  const handleSelectPlayer = useCallback(
    (player: PlayerInfo) => {
      setSelectedPlayer(player)
      const existing = allScores.filter(s => s.playerId === player.id)
      const prePopulated: Record<number, number> = {}
      existing.forEach(s => {
        prePopulated[s.holeNumber] = s.strokes
      })
      holes.forEach(h => {
        if (!prePopulated[h.number]) prePopulated[h.number] = h.par
      })
      setLocalScores(prePopulated)
      setSavedHoles(new Set(existing.map(s => s.holeNumber)))
      setSaveError(null)
      setPhase('score')
    },
    [allScores, holes]
  )

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players
    const q = search.toLowerCase()
    return players.filter(p => p.name.toLowerCase().includes(q))
  }, [players, search])

  // ─── Score save ───────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!selectedPlayer || saving) return
    setSaving(true)
    setSaveError(null)

    try {
      const holesToSave = Object.entries(localScores)
      for (const [holeNumStr, strokes] of holesToSave) {
        const holeNumber = parseInt(holeNumStr)

        const { data: existing } = await supabase
          .from('scores')
          .select('id')
          .eq('player_id', selectedPlayer.id)
          .eq('tournament_id', tournamentId)
          .eq('hole_number', holeNumber)
          .maybeSingle()

        if (existing) {
          const { error } = await supabase
            .from('scores')
            .update({ strokes, submitted_at: new Date().toISOString() })
            .eq('id', existing.id)
          if (error) throw new Error(error.message)
        } else {
          const { error } = await supabase.from('scores').insert({
            tournament_id: tournamentId,
            player_id: selectedPlayer.id,
            hole_number: holeNumber,
            strokes,
            submitted_at: new Date().toISOString(),
          })
          if (error) throw new Error(error.message)
        }
      }
      setSavedHoles(new Set(holesToSave.map(([k]) => parseInt(k))))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [selectedPlayer, saving, localScores, supabase, tournamentId])

  // ─── Per-hole derived values for the selected player ─────────────────────

  const holeDerivations = useMemo(() => {
    return holes.map(hole => {
      const strokes = getStrokesOnHole(selectedCourseHandicap, hole.handicap, holes.length)
      return { holeNumber: hole.number, strokesReceived: strokes }
    })
  }, [holes, selectedCourseHandicap])

  const getStrokesReceived = (holeNumber: number) =>
    holeDerivations.find(d => d.holeNumber === holeNumber)?.strokesReceived ?? 0

  // ─── Running totals for selected player ──────────────────────────────────

  const myTotals = useMemo(() => {
    let totalPts = 0
    let totalGross = 0
    let totalNet = 0

    Object.entries(localScores).forEach(([holeNumStr, gross]) => {
      const holeNumber = parseInt(holeNumStr)
      const hole = holes.find(h => h.number === holeNumber)
      if (!hole) return
      const received = getStrokesReceived(holeNumber)
      totalGross += gross
      totalNet += gross - received
      totalPts += computeStablefordPoints(gross, hole.par, received, tournament.stablefordConfig)
    })

    return { totalPts, totalGross, totalNet }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localScores, holes, holeDerivations, tournament.stablefordConfig])

  const myNetRelative = myTotals.totalNet - totalPar

  const isDirty = useMemo(() => {
    if (!selectedPlayer) return false
    return Object.entries(localScores).some(([holeNumStr, strokes]) => {
      const holeNumber = parseInt(holeNumStr)
      return !savedHoles.has(holeNumber) ||
        allScores.find(s => s.playerId === selectedPlayer.id && s.holeNumber === holeNumber)?.strokes !== strokes
    })
  }, [localScores, savedHoles, selectedPlayer, allScores])

  // ─── Leaderboard computation ──────────────────────────────────────────────

  const leaderboard = useMemo(() => {
    return players
      .map(p => {
        const pScores = allScores.filter(s => s.playerId === p.id)
        const pCourseHcp = resolveHandicap(p, tournament, totalPar)
        let totalPts = 0
        let totalGross = 0
        let totalNet = 0

        pScores.forEach(s => {
          const hole = holes.find(h => h.number === s.holeNumber)
          if (!hole) return
          const received = getStrokesOnHole(pCourseHcp, hole.handicap, holes.length)
          totalGross += s.strokes
          totalNet += s.strokes - received
          totalPts += computeStablefordPoints(s.strokes, hole.par, received, tournament.stablefordConfig)
        })

        return {
          ...p,
          totalPts,
          totalGross,
          totalNet,
          netRelative: totalNet - totalPar,
          holesCompleted: pScores.length,
        }
      })
      .filter(p => p.holesCompleted > 0)
      .sort((a, b) => {
        if (isStableford) {
          if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts
          return b.holesCompleted - a.holesCompleted
        }
        // Stroke Play: sort by net score (lowest first), then most holes played
        if (a.netRelative !== b.netRelative) return a.netRelative - b.netRelative
        return b.holesCompleted - a.holesCompleted
      })
  }, [players, allScores, holes, tournament, totalPar, isStableford])

  // ─── Render: Player Picker ────────────────────────────────────────────────

  if (phase === 'pick') {
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
          <div
            style={{
              position: 'absolute',
              top: -30,
              right: -30,
              fontSize: '10rem',
              opacity: 0.03,
              pointerEvents: 'none',
            }}
          >
            ⛳
          </div>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), #5a3e10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              ⛳
            </div>
            <span style={{ fontFamily: 'var(--fd)', fontSize: '0.9rem', color: 'var(--gold)' }}>
              Lotus Links
            </span>
          </div>

          {leagueName && (
            <div className="section-tag" style={{ marginBottom: '0.5rem' }}>
              {leagueName}
            </div>
          )}
          <h1
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 'clamp(1.4rem, 5vw, 2rem)',
              fontWeight: 400,
              color: 'var(--text)',
              marginBottom: '0.35rem',
              lineHeight: 1.15,
            }}
          >
            {tournament.name}
          </h1>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {formattedDate} &middot; {tournament.course}
          </div>
          <span className="badge badge-gold" style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}>
            {tournament.format}
          </span>
        </div>

        {/* Player picker */}
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: '0.35rem' }}>
            Who&apos;s scoring?
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Select your name to open your scorecard.
          </p>

          <input
            className="input"
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: '1rem', fontSize: '1rem' }}
            autoFocus
          />

          {players.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏌️</div>
              <div style={{ fontSize: '0.9rem' }}>
                No players have been added to this tournament yet. Contact the organizer.
              </div>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              No players match &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredPlayers.map(p => {
                const pScores = allScores.filter(s => s.playerId === p.id)
                const hasScores = pScores.length > 0
                const pCourseHcp = resolveHandicap(p, tournament, totalPar)
                let displayVal = 0
                if (hasScores) {
                  if (isStableford) {
                    displayVal = pScores.reduce((sum, s) => {
                      const hole = holes.find(h => h.number === s.holeNumber)
                      if (!hole) return sum
                      const received = getStrokesOnHole(pCourseHcp, hole.handicap, holes.length)
                      return sum + computeStablefordPoints(s.strokes, hole.par, received, tournament.stablefordConfig)
                    }, 0)
                  } else {
                    const netTotal = pScores.reduce((sum, s) => {
                      const hole = holes.find(h => h.number === s.holeNumber)
                      if (!hole) return sum
                      return sum + s.strokes - getStrokesOnHole(pCourseHcp, hole.handicap, holes.length)
                    }, 0)
                    const parSoFar = pScores.reduce((sum, s) => {
                      const hole = holes.find(h => h.number === s.holeNumber)
                      return sum + (hole?.par ?? 0)
                    }, 0)
                    displayVal = netTotal - parSoFar
                  }
                }

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPlayer(p)}
                    className="tap"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border)',
                      borderRadius: 2,
                      textAlign: 'left',
                      width: '100%',
                      fontFamily: 'inherit',
                      color: 'var(--text)',
                      fontSize: 'inherit',
                      minHeight: 56,
                      transition: 'border-color 0.15s',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--gold-dim)',
                        border: '1px solid var(--gold-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        color: 'var(--gold)',
                        fontFamily: 'var(--fm)',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {p.name}
                        {p.handicapIndex == null && (
                          <span title="No Handicap Index — treated as scratch" style={{ fontSize: '0.7rem', color: 'var(--over)', fontFamily: 'var(--fm)' }}>
                            ⚠ scratch
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', marginTop: '0.1rem' }}>
                        HCP {p.handicapIndex != null ? p.handicapIndex : p.handicap}
                        {hasScores ? ` · ${pScores.length}/${holes.length} holes` : ''}
                      </div>
                    </div>
                    {hasScores && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', color: isStableford ? 'var(--gold)' : (displayVal <= 0 ? '#4CAF50' : 'var(--over)') }}>
                          {isStableford ? displayVal : fmtRelative(displayVal)}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                          {isStableford ? 'pts' : 'net'}
                        </div>
                      </div>
                    )}
                    <span style={{ fontSize: '1rem', color: 'var(--text-dim)', flexShrink: 0 }}>›</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Leaderboard preview */}
          {leaderboard.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <div className="label" style={{ marginBottom: '0.75rem' }}>
                Current Standings
              </div>
              <LeaderboardSection
                leaderboard={leaderboard}
                holes={holes}
                highlightPlayerId={null}
                isStableford={isStableford}
              />
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <PoweredByFooter />
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: Scorecard ────────────────────────────────────────────────────

  const holeCount = holes.length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', ...accentStyle }}>
      {/* Sticky top bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--gold-dim)',
            border: '1px solid var(--gold-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            color: 'var(--gold)',
            fontFamily: 'var(--fm)',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {selectedPlayer!.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {selectedPlayer!.name}
            {hasNoHandicap && (
              <span title="No Handicap Index — scoring as scratch" style={{ fontSize: '0.65rem', color: 'var(--over)', fontFamily: 'var(--fm)' }}>
                ⚠
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
            {isStableford
              ? `${fmtPoints(myTotals.totalPts)} · HCP ${selectedCourseHandicap}`
              : `Net ${fmtRelative(myNetRelative)} · HCP ${selectedCourseHandicap}`}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '0.75rem', flexShrink: 0 }}
          onClick={() => setPhase('pick')}
        >
          Change
        </button>
      </div>

      {/* Tournament header */}
      <div
        style={{
          background: 'linear-gradient(180deg, var(--forest) 0%, var(--bg) 100%)',
          padding: '1.5rem 1.25rem 1rem',
          textAlign: 'center',
        }}
      >
        {leagueName && (
          <div className="section-tag" style={{ marginBottom: '0.35rem' }}>
            {leagueName}
          </div>
        )}
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
          {tournament.name}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {formattedDate} &middot; {tournament.course}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 1rem 3rem' }}>
        {/* Save error */}
        {saveError && (
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
            {saveError}
          </div>
        )}

        {/* No handicap warning */}
        {hasNoHandicap && (
          <div
            style={{
              background: 'var(--over-dim)',
              border: '1px solid var(--over-border)',
              borderRadius: 4,
              padding: '0.6rem 0.875rem',
              marginBottom: '1rem',
              fontSize: '0.78rem',
              color: 'var(--over)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>⚠</span>
            <span>No Handicap Index on file — scoring as scratch (0 handicap).</span>
          </div>
        )}

        {/* Scorecard */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: '1rem',
          }}
        >
          {/* Scorecard header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr auto auto',
              gap: '0.4rem',
              alignItems: 'center',
              padding: '0.6rem 0.75rem',
              background: 'var(--forest)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {['Hole', 'Info', 'Strokes', isStableford ? 'Pts' : 'Net'].map((h, i) => (
              <div
                key={h}
                style={{
                  fontSize: '0.58rem',
                  color: 'rgba(240,237,230,0.5)',
                  fontFamily: 'var(--fm)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  textAlign: i >= 2 ? 'center' : 'left',
                  minWidth: i === 2 ? 96 : i === 3 ? 36 : undefined,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Hole rows */}
          {holes.map((hole, idx) => {
            const gross = localScores[hole.number] ?? hole.par
            const received = getStrokesReceived(hole.number)
            const net = gross - received
            const netRelative = net - hole.par
            const pts = computeStablefordPoints(gross, hole.par, received, tournament.stablefordConfig)
            const isSaved = savedHoles.has(hole.number)

            const ptsColor =
              pts >= 5 ? '#4CAF50' :
              pts >= 3 ? '#4CAF50' :
              pts === 2 ? 'var(--text)' :
              pts === 1 ? 'var(--text-dim)' :
              'var(--over)'

            const netColor = netRelative < 0 ? '#4CAF50' : netRelative > 0 ? 'var(--over)' : 'var(--text-muted)'

            return (
              <div
                key={hole.number}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr auto auto',
                  gap: '0.4rem',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  borderBottom: idx < holes.length - 1 ? '1px solid var(--border)' : 'none',
                  background: isSaved ? 'transparent' : 'rgba(200,168,75,0.03)',
                }}
              >
                {/* Hole number */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--surface2)',
                      border: `1px solid ${isSaved ? 'var(--border)' : 'var(--gold-border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--fm)',
                      color: isSaved ? 'var(--text-muted)' : 'var(--gold)',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {hole.number}
                  </div>
                </div>

                {/* Hole info */}
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                    Par {hole.par}
                    {hole.yardage ? ` · ${hole.yardage}yd` : ''}
                    {received > 0 && (
                      <span style={{ color: 'var(--gold)', marginLeft: '0.3rem' }}>+{received}hcp</span>
                    )}
                  </div>
                </div>

                {/* Stroke counter */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    minWidth: 96,
                    justifyContent: 'center',
                  }}
                >
                  <button
                    onClick={() =>
                      setLocalScores(prev => ({
                        ...prev,
                        [hole.number]: Math.max(1, (prev[hole.number] ?? hole.par) - 1),
                      }))
                    }
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px 0 0 4px',
                      color: 'var(--text)',
                      fontSize: '1.1rem',
                      lineHeight: 1,
                      cursor: 'pointer',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      touchAction: 'manipulation',
                    }}
                  >
                    −
                  </button>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--surface3)',
                      borderTop: '1px solid var(--border)',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: 'var(--fm)',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                      flexDirection: 'column',
                    }}
                  >
                    <span>{gross}</span>
                    {isStrokePlay && received > 0 && (
                      <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', lineHeight: 1 }}>
                        net {net}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setLocalScores(prev => ({
                        ...prev,
                        [hole.number]: Math.min(12, (prev[hole.number] ?? hole.par) + 1),
                      }))
                    }
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: '0 4px 4px 0',
                      color: 'var(--text)',
                      fontSize: '1.1rem',
                      lineHeight: 1,
                      cursor: 'pointer',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      touchAction: 'manipulation',
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Points or Net score */}
                <div style={{ textAlign: 'center', minWidth: 36 }}>
                  {isStableford ? (
                    <span style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 600, color: ptsColor }}>
                      {pts}
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--fd)', fontSize: '1rem', fontWeight: 600, color: netColor }}>
                      {fmtRelative(netRelative)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Totals row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr auto auto',
              gap: '0.4rem',
              alignItems: 'center',
              padding: '0.75rem',
              background: 'var(--forest)',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div />
            <div style={{ fontSize: '0.72rem', color: 'rgba(240,237,230,0.6)', fontFamily: 'var(--fm)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Total ({Object.keys(localScores).length}/{holeCount})
            </div>
            <div style={{ minWidth: 96 }} />
            <div style={{ textAlign: 'center', minWidth: 36 }}>
              {isStableford ? (
                <>
                  <span style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold)' }}>
                    {myTotals.totalPts}
                  </span>
                  <div style={{ fontSize: '0.58rem', color: 'rgba(240,237,230,0.4)', fontFamily: 'var(--fm)' }}>pts</div>
                </>
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 700, color: myNetRelative < 0 ? '#4CAF50' : myNetRelative > 0 ? 'var(--over)' : 'var(--text-muted)' }}>
                    {fmtRelative(myNetRelative)}
                  </span>
                  <div style={{ fontSize: '0.58rem', color: 'rgba(240,237,230,0.4)', fontFamily: 'var(--fm)' }}>net</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          className="submit-btn"
          onClick={handleSave}
          disabled={saving}
          style={{ marginBottom: '0.5rem' }}
        >
          {saving
            ? 'Saving...'
            : isDirty
            ? isStableford
              ? `Save Scores (${fmtPoints(myTotals.totalPts)})`
              : `Save Scores (Net ${fmtRelative(myNetRelative)})`
            : isStableford
            ? `Scores Saved ✓ (${fmtPoints(myTotals.totalPts)})`
            : `Scores Saved ✓ (Net ${fmtRelative(myNetRelative)})`}
        </button>
        {isDirty && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '1.5rem' }}>
            Unsaved changes — tap Save to update the leaderboard
          </div>
        )}

        {/* Live leaderboard */}
        <div style={{ marginTop: '2rem' }}>
          <div className="label" style={{ marginBottom: '0.75rem' }}>
            Live Leaderboard
          </div>
          {leaderboard.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Scores will appear here once players save their scorecards.
            </div>
          ) : (
            <LeaderboardSection
              leaderboard={leaderboard}
              holes={holes}
              highlightPlayerId={selectedPlayer?.id ?? null}
              isStableford={isStableford}
            />
          )}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <PoweredByFooter />
        </div>
      </div>
    </div>
  )
}

// ─── Leaderboard sub-component ────────────────────────────────────────────────

interface LeaderboardEntry {
  id: string
  name: string
  handicap: number
  handicapIndex: number | null
  totalPts: number
  totalGross: number
  totalNet: number
  netRelative: number
  holesCompleted: number
}

function LeaderboardSection({
  leaderboard,
  holes,
  highlightPlayerId,
  isStableford,
}: {
  leaderboard: LeaderboardEntry[]
  holes: HoleInfo[]
  highlightPlayerId: string | null
  isStableford: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 52px 56px',
          gap: '0.5rem',
          alignItems: 'center',
          padding: '0.4rem 0.75rem',
        }}
      >
        {(['Pos', 'Player', 'Thru', isStableford ? 'Pts' : 'Net'] as const).map((h, i) => (
          <div
            key={h}
            style={{
              fontSize: '0.58rem',
              letterSpacing: '0.15em',
              color: 'var(--text-dim)',
              fontFamily: 'var(--fm)',
              textTransform: 'uppercase',
              textAlign: i >= 2 ? 'center' : 'left',
            }}
          >
            {h}
          </div>
        ))}
      </div>

      {leaderboard.map((entry, i) => {
        const isMe = entry.id === highlightPlayerId
        const isLeader = i === 0
        const isFinished = entry.holesCompleted === holes.length

        return (
          <div
            key={entry.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 52px 56px',
              gap: '0.5rem',
              alignItems: 'center',
              padding: '0.65rem 0.75rem',
              borderRadius: 4,
              background: isMe
                ? 'var(--gold-dim)'
                : isLeader
                ? 'linear-gradient(90deg, rgba(200,168,75,0.06), transparent)'
                : 'var(--surface)',
              border: `1px solid ${isMe ? 'var(--gold-border)' : isLeader ? 'var(--gold-border)' : 'var(--border)'}`,
              animation: `fadeUp 0.35s ease ${i * 0.04}s both`,
            }}
          >
            {/* Position */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontFamily: 'var(--fm)',
                fontWeight: 700,
                background: i === 0 ? 'var(--gold)' : i === 1 ? 'rgba(192,192,192,0.3)' : i === 2 ? 'rgba(180,120,60,0.3)' : 'var(--surface2)',
                color: i === 0 ? '#0a120a' : i === 1 ? '#d0d0d0' : i === 2 ? '#c87830' : 'var(--text-dim)',
              }}
            >
              {i + 1}
            </div>

            {/* Player */}
            <div>
              <div style={{ fontSize: '0.9rem', color: isMe ? 'var(--gold)' : 'var(--text)', fontWeight: isMe || isLeader ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                {isMe && <span style={{ marginLeft: '0.2rem', fontSize: '0.6rem', fontFamily: 'var(--fm)', color: 'var(--gold)' }}>(you)</span>}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                HCP {entry.handicapIndex ?? entry.handicap}
                {!isStableford && ` · gross ${entry.totalGross}`}
              </div>
            </div>

            {/* Holes */}
            <div style={{ textAlign: 'center' }}>
              {isFinished ? (
                <span className="badge badge-gold" style={{ fontSize: '0.58rem' }}>F</span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                  {entry.holesCompleted}/{holes.length}
                </span>
              )}
            </div>

            {/* Score */}
            <div style={{ textAlign: 'center' }}>
              {isStableford ? (
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', fontWeight: 600, color: isLeader ? 'var(--gold)' : 'var(--text)' }}>
                  {entry.totalPts}
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 600, color: entry.netRelative < 0 ? '#4CAF50' : entry.netRelative > 0 ? 'var(--over)' : 'var(--text-muted)' }}>
                  {fmtRelative(entry.netRelative)}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
