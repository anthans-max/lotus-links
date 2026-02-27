'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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
}

interface HoleInfo {
  number: number
  par: number
  yardage: number | null
  handicap: number | null
}

interface PlayerInfo {
  id: string
  name: string
  handicap: number
}

interface ScoreEntry {
  playerId: string
  holeNumber: number
  strokes: number
}

interface Props {
  tournament: TournamentInfo
  leagueName: string
  holes: HoleInfo[]
  players: PlayerInfo[]
  initialScores: ScoreEntry[]
  tournamentId: string
}

// ─── Stableford math ─────────────────────────────────────────────────────────

function getHandicapStrokes(
  playerHandicap: number,
  holeHandicap: number | null,
  totalHoles: number
): number {
  if (holeHandicap == null || totalHoles === 0) return 0
  const base = Math.floor(playerHandicap / totalHoles)
  const remainder = playerHandicap % totalHoles
  return base + (holeHandicap <= remainder ? 1 : 0)
}

function stablefordPoints(
  grossStrokes: number,
  par: number,
  holeHandicap: number | null,
  playerHandicap: number,
  totalHoles: number
): number {
  const hcStrokes = getHandicapStrokes(playerHandicap, holeHandicap, totalHoles)
  const netStrokes = grossStrokes - hcStrokes
  return Math.max(0, par - netStrokes + 2)
}

function fmtPoints(pts: number) {
  return pts === 1 ? '1 pt' : `${pts} pts`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StablefordScoringApp({
  tournament,
  leagueName,
  holes,
  players,
  initialScores,
  tournamentId,
}: Props) {
  const supabase = useMemo(() => createClient(), [])

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
            if (!row.player_id) return // skip scramble group scores
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
      // Pre-populate localScores from existing scores for this player
      const existing = allScores.filter(s => s.playerId === player.id)
      const prePopulated: Record<number, number> = {}
      existing.forEach(s => {
        prePopulated[s.holeNumber] = s.strokes
      })
      // Default un-entered holes to par
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

        // SELECT first to determine INSERT vs UPDATE
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

  // ─── Leaderboard ──────────────────────────────────────────────────────────

  const leaderboard = useMemo(() => {
    return players
      .map(p => {
        const pScores = allScores.filter(s => s.playerId === p.id)
        const totalPts = pScores.reduce((sum, s) => {
          const hole = holes.find(h => h.number === s.holeNumber)
          if (!hole) return sum
          return sum + stablefordPoints(s.strokes, hole.par, hole.handicap, p.handicap, holes.length)
        }, 0)
        return { ...p, totalPts, holesCompleted: pScores.length }
      })
      .filter(p => p.holesCompleted > 0)
      .sort((a, b) => {
        if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts
        return b.holesCompleted - a.holesCompleted
      })
  }, [players, allScores, holes])

  // ─── My current total ─────────────────────────────────────────────────────

  const myTotalPts = useMemo(() => {
    if (!selectedPlayer) return 0
    return Object.entries(localScores).reduce((sum, [holeNumStr, strokes]) => {
      const holeNumber = parseInt(holeNumStr)
      const hole = holes.find(h => h.number === holeNumber)
      if (!hole) return sum
      return (
        sum +
        stablefordPoints(strokes, hole.par, hole.handicap, selectedPlayer.handicap, holes.length)
      )
    }, 0)
  }, [selectedPlayer, localScores, holes])

  const isDirty = useMemo(() => {
    if (!selectedPlayer) return false
    return Object.entries(localScores).some(([holeNumStr, strokes]) => {
      const holeNumber = parseInt(holeNumStr)
      return !savedHoles.has(holeNumber) ||
        allScores.find(s => s.playerId === selectedPlayer.id && s.holeNumber === holeNumber)?.strokes !== strokes
    })
  }, [localScores, savedHoles, selectedPlayer, allScores])

  // ─── Render: Player Picker ────────────────────────────────────────────────

  if (phase === 'pick') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
            }}
          >
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
          <span
            className="badge badge-gold"
            style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}
          >
            {tournament.format}
          </span>
        </div>

        {/* Player picker */}
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
          <div
            style={{
              fontFamily: 'var(--fd)',
              fontSize: '1.25rem',
              marginBottom: '0.35rem',
            }}
          >
            Who&apos;s scoring?
          </div>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              marginBottom: '1.25rem',
              lineHeight: 1.5,
            }}
          >
            Select your name to open your scorecard. You can also enter scores on behalf of
            another player by switching names.
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
            <div
              className="card"
              style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}
            >
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
                const totalPts = hasScores
                  ? pScores.reduce((sum, s) => {
                      const hole = holes.find(h => h.number === s.holeNumber)
                      if (!hole) return sum
                      return (
                        sum + stablefordPoints(s.strokes, hole.par, hole.handicap, p.handicap, holes.length)
                      )
                    }, 0)
                  : 0

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
                      {p.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{p.name}</div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-dim)',
                          fontFamily: 'var(--fm)',
                          marginTop: '0.1rem',
                        }}
                      >
                        HCP {p.handicap}
                        {hasScores ? ` · ${pScores.length}/${holes.length} holes` : ''}
                      </div>
                    </div>
                    {hasScores && (
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontFamily: 'var(--fd)',
                            fontSize: '1.1rem',
                            color: 'var(--gold)',
                          }}
                        >
                          {totalPts}
                        </div>
                        <div
                          style={{
                            fontSize: '0.6rem',
                            color: 'var(--text-dim)',
                            fontFamily: 'var(--fm)',
                          }}
                        >
                          pts
                        </div>
                      </div>
                    )}
                    <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>›</span>
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
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
          {selectedPlayer!.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 500,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedPlayer!.name}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
            HCP {selectedPlayer!.handicap} &middot; {myTotalPts} pts
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
        <div
          style={{
            fontFamily: 'var(--fd)',
            fontSize: '1.25rem',
            color: 'var(--text)',
            marginBottom: '0.25rem',
          }}
        >
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
              gridTemplateColumns: '48px 1fr auto auto',
              gap: '0.5rem',
              alignItems: 'center',
              padding: '0.6rem 0.75rem',
              background: 'var(--forest)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontSize: '0.58rem',
                color: 'rgba(240,237,230,0.5)',
                fontFamily: 'var(--fm)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Hole
            </div>
            <div
              style={{
                fontSize: '0.58rem',
                color: 'rgba(240,237,230,0.5)',
                fontFamily: 'var(--fm)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Info
            </div>
            <div
              style={{
                fontSize: '0.58rem',
                color: 'rgba(240,237,230,0.5)',
                fontFamily: 'var(--fm)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textAlign: 'center',
                minWidth: 100,
              }}
            >
              Strokes
            </div>
            <div
              style={{
                fontSize: '0.58rem',
                color: 'rgba(240,237,230,0.5)',
                fontFamily: 'var(--fm)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textAlign: 'right',
                minWidth: 44,
              }}
            >
              Pts
            </div>
          </div>

          {/* Hole rows */}
          {holes.map((hole, idx) => {
            const strokes = localScores[hole.number] ?? hole.par
            const pts = stablefordPoints(
              strokes,
              hole.par,
              hole.handicap,
              selectedPlayer!.handicap,
              holeCount
            )
            const isSaved = savedHoles.has(hole.number)
            const ptsColor =
              pts >= 4
                ? '#4CAF50'
                : pts === 3
                ? '#4CAF50'
                : pts === 2
                ? 'var(--text)'
                : pts === 1
                ? 'var(--text-dim)'
                : 'var(--over)'

            return (
              <div
                key={hole.number}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr auto auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.5rem 0.75rem',
                  borderBottom:
                    idx < holes.length - 1 ? '1px solid var(--border)' : 'none',
                  background: isSaved ? 'transparent' : 'rgba(200,168,75,0.03)',
                }}
              >
                {/* Hole number */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
                    }}
                  >
                    {hole.number}
                  </div>
                </div>

                {/* Hole info */}
                <div>
                  <div
                    style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}
                  >
                    Par {hole.par}
                    {hole.yardage ? ` · ${hole.yardage}yd` : ''}
                    {hole.handicap ? ` · HCP ${hole.handicap}` : ''}
                  </div>
                </div>

                {/* Stroke counter */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0',
                    minWidth: 100,
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
                      width: 36,
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
                    }}
                  >
                    {strokes}
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

                {/* Stableford points */}
                <div
                  style={{
                    textAlign: 'right',
                    minWidth: 44,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--fd)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: ptsColor,
                    }}
                  >
                    {pts}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Totals row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr auto auto',
              gap: '0.5rem',
              alignItems: 'center',
              padding: '0.75rem',
              background: 'var(--forest)',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div />
            <div
              style={{
                fontSize: '0.72rem',
                color: 'rgba(240,237,230,0.6)',
                fontFamily: 'var(--fm)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Total ({Object.keys(localScores).length}/{holeCount} holes)
            </div>
            <div style={{ minWidth: 100 }} />
            <div style={{ textAlign: 'right', minWidth: 44 }}>
              <span
                style={{
                  fontFamily: 'var(--fd)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--gold)',
                }}
              >
                {myTotalPts}
              </span>
              <div
                style={{
                  fontSize: '0.58rem',
                  color: 'rgba(240,237,230,0.4)',
                  fontFamily: 'var(--fm)',
                }}
              >
                pts
              </div>
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
            ? `Save Scores (${fmtPoints(myTotalPts)})`
            : `Scores Saved ✓ (${fmtPoints(myTotalPts)})`}
        </button>
        {isDirty && (
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            Unsaved changes — tap Save to update the leaderboard
          </div>
        )}

        {/* Live leaderboard */}
        <div style={{ marginTop: '2rem' }}>
          <div className="label" style={{ marginBottom: '0.75rem' }}>
            Live Leaderboard
          </div>
          {leaderboard.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                color: 'var(--text-muted)',
                fontSize: '0.88rem',
              }}
            >
              Scores will appear here once players save their scorecards.
            </div>
          ) : (
            <LeaderboardSection
              leaderboard={leaderboard}
              holes={holes}
              highlightPlayerId={selectedPlayer?.id ?? null}
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
  totalPts: number
  holesCompleted: number
}

function LeaderboardSection({
  leaderboard,
  holes,
  highlightPlayerId,
}: {
  leaderboard: LeaderboardEntry[]
  holes: HoleInfo[]
  highlightPlayerId: string | null
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
        {(['Pos', 'Player', 'Thru', 'Pts'] as const).map((h, i) => (
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
                background:
                  i === 0
                    ? 'var(--gold)'
                    : i === 1
                    ? 'rgba(192,192,192,0.3)'
                    : i === 2
                    ? 'rgba(180,120,60,0.3)'
                    : 'var(--surface2)',
                color:
                  i === 0
                    ? '#0a120a'
                    : i === 1
                    ? '#d0d0d0'
                    : i === 2
                    ? '#c87830'
                    : 'var(--text-dim)',
              }}
            >
              {i + 1}
            </div>

            {/* Player */}
            <div>
              <div
                style={{
                  fontSize: '0.9rem',
                  color: isMe ? 'var(--gold)' : 'var(--text)',
                  fontWeight: isMe || isLeader ? 600 : 400,
                }}
              >
                {entry.name}
                {isMe && (
                  <span
                    style={{
                      marginLeft: '0.4rem',
                      fontSize: '0.6rem',
                      fontFamily: 'var(--fm)',
                      color: 'var(--gold)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    (you)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                HCP {entry.handicap}
              </div>
            </div>

            {/* Holes */}
            <div style={{ textAlign: 'center' }}>
              {isFinished ? (
                <span className="badge badge-gold" style={{ fontSize: '0.58rem' }}>
                  F
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--fm)',
                  }}
                >
                  {entry.holesCompleted}/{holes.length}
                </span>
              )}
            </div>

            {/* Points */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--fd)',
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: isLeader ? 'var(--gold)' : 'var(--text)',
                }}
              >
                {entry.totalPts}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
