'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeCourseHandicap, getStrokesOnHole } from '@/lib/scoring/handicap'
import { computeStablefordPoints, type StablefordPointsConfig } from '@/lib/scoring/stableford'
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

interface ConfettiItem {
  id: number
  left: string
  color: string
  delay: string
  size: string
}

type Screen = 'pick' | 'scoring' | 'review' | 'success'

// ─── Module-level helpers ─────────────────────────────────────────────────────

function fmtPoints(pts: number) {
  return pts === 1 ? '1 pt' : `${pts} pts`
}

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

/** Initialize draft scores for ALL players × ALL holes from initialScores; default to par. */
function initAllDraftScores(
  players: PlayerInfo[],
  holes: HoleInfo[],
  initialScores: ScoreEntry[]
): Record<string, Record<number, number>> {
  const draft: Record<string, Record<number, number>> = {}
  for (const player of players) {
    draft[player.id] = {}
    for (const hole of holes) {
      const existing = initialScores.find(
        s => s.playerId === player.id && s.holeNumber === hole.number
      )
      draft[player.id][hole.number] = existing ? existing.strokes : hole.par
    }
  }
  return draft
}

/** Points badge style based on Stableford points earned. */
function ptsBadgeStyle(pts: number): { color: string; bg: string; fontSize: string; fontWeight: number } {
  if (pts >= 5) return { color: 'var(--gold-light)', bg: 'rgba(230,201,106,0.25)', fontSize: '0.8rem', fontWeight: 700 }
  if (pts >= 3) return { color: 'var(--gold-light)', bg: 'var(--gold-dim)', fontSize: '0.72rem', fontWeight: 600 }
  if (pts >= 1) return { color: 'var(--gold)', bg: 'var(--gold-dim)', fontSize: '0.72rem', fontWeight: 500 }
  return { color: 'var(--text-dim)', bg: 'var(--surface2)', fontSize: '0.72rem', fontWeight: 400 }
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
    ? ({
        '--league-accent': leagueColor,
        '--league-accent-dim': `color-mix(in srgb, ${leagueColor} 15%, transparent)`,
        '--league-accent-border': `color-mix(in srgb, ${leagueColor} 25%, transparent)`,
      } as React.CSSProperties)
    : {}

  const supabase = useMemo(() => createClient(), [])

  const isStableford = tournament.format === 'Stableford'
  const isStrokePlay = tournament.format === 'Stroke Play'
  const totalPar = useMemo(() => holes.reduce((a, h) => a + h.par, 0), [holes])

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

  // ─── Screen / navigation state ─────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>('pick')
  const [search, setSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null)

  // ─── Shared realtime state ─────────────────────────────────────────────────
  const [allScores, setAllScores] = useState<ScoreEntry[]>(initialScores)

  // ─── Non-Stableford (per-player scrollable) state ──────────────────────────
  const [localScores, setLocalScores] = useState<Record<number, number>>({})
  const [savedHoles, setSavedHoles] = useState<Set<number>>(new Set())
  const [savingPlayer, setSavingPlayer] = useState(false)
  const [saveErrorPlayer, setSaveErrorPlayer] = useState<string | null>(null)

  // ─── Stableford (hole-by-hole group) state ─────────────────────────────────
  const [holeIdx, setHoleIdx] = useState(0)
  const [animKeys, setAnimKeys] = useState<Record<string, number>>({})
  const [allDraftScores, setAllDraftScores] = useState<Record<string, Record<number, number>>>(
    () => initAllDraftScores(players, holes, initialScores)
  )
  /** Set of "playerId:holeNumber" keys that have been actively changed by the user. */
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confetti, setConfetti] = useState<ConfettiItem[]>([])
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [useGross, setUseGross] = useState(false)

  // ─── Theme ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scoringTheme')
      if (saved === 'light' || saved === 'dark') setTheme(saved as 'dark' | 'light')
    } catch { /* localStorage unavailable */ }
  }, [])

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem('scoringTheme', next) } catch { /* ignore */ }
      return next
    })
  }

  const phoneClass = `phone${theme === 'light' ? ' light-mode' : ''}`

  // ─── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`stableford-${tournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores', filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as { player_id: string | null; hole_number: number; strokes: number }
            if (!row.player_id) return
            setAllScores(prev => {
              const filtered = prev.filter(
                s => !(s.playerId === row.player_id && s.holeNumber === row.hole_number)
              )
              return [...filtered, { playerId: row.player_id!, holeNumber: row.hole_number, strokes: row.strokes }]
            })
          }
          if (payload.eventType === 'DELETE') {
            const row = payload.old as { player_id: string | null; hole_number: number }
            if (!row.player_id) return
            setAllScores(prev =>
              prev.filter(s => !(s.playerId === row.player_id && s.holeNumber === row.hole_number))
            )
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, tournamentId])

  // ─── Before-unload warning (Stableford only) ───────────────────────────────
  const isDirtyGroup = changedKeys.size > 0 && screen !== 'success'

  useEffect(() => {
    if (!isStableford) return
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyGroup) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isStableford, isDirtyGroup])

  // ─── Confetti on success ────────────────────────────────────────────────────
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

  // ─── Course handicaps for all players ──────────────────────────────────────
  const allCourseHandicaps = useMemo(() => {
    const result: Record<string, number> = {}
    for (const player of players) {
      result[player.id] = resolveHandicap(player, tournament, totalPar)
    }
    return result
  }, [players, tournament, totalPar])

  // ─── Non-Stableford: selected player derived values ────────────────────────
  const selectedCourseHandicap = useMemo(() => {
    if (!selectedPlayer) return 0
    return resolveHandicap(selectedPlayer, tournament, totalPar)
  }, [selectedPlayer, tournament, totalPar])

  const hasNoHandicap = selectedPlayer != null && selectedPlayer.handicapIndex == null && selectedPlayer.handicap === 0

  const holeDerivations = useMemo(() => {
    return holes.map(hole => ({
      holeNumber: hole.number,
      strokesReceived: getStrokesOnHole(selectedCourseHandicap, hole.handicap, holes.length),
    }))
  }, [holes, selectedCourseHandicap])

  const getStrokesReceivedSingle = (holeNumber: number) =>
    holeDerivations.find(d => d.holeNumber === holeNumber)?.strokesReceived ?? 0

  const myTotals = useMemo(() => {
    let totalPts = 0, totalGross = 0, totalNet = 0
    Object.entries(localScores).forEach(([holeNumStr, gross]) => {
      const holeNumber = parseInt(holeNumStr)
      const hole = holes.find(h => h.number === holeNumber)
      if (!hole) return
      const received = getStrokesReceivedSingle(holeNumber)
      totalGross += gross
      totalNet += gross - received
      totalPts += computeStablefordPoints(gross, hole.par, received, tournament.stablefordConfig)
    })
    return { totalPts, totalGross, totalNet }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localScores, holes, holeDerivations, tournament.stablefordConfig])

  const myNetRelative = myTotals.totalNet - totalPar

  const isDirtySingle = useMemo(() => {
    if (!selectedPlayer) return false
    return Object.entries(localScores).some(([holeNumStr, strokes]) => {
      const holeNumber = parseInt(holeNumStr)
      return !savedHoles.has(holeNumber) ||
        allScores.find(s => s.playerId === selectedPlayer.id && s.holeNumber === holeNumber)?.strokes !== strokes
    })
  }, [localScores, savedHoles, selectedPlayer, allScores])

  // ─── Stableford group: per-player helpers ──────────────────────────────────
  const getPlayerStrokesOnHole = useCallback((playerId: string, holeNumber: number): number => {
    const hole = holes.find(h => h.number === holeNumber)
    if (!hole) return 0
    const courseHcp = allCourseHandicaps[playerId] ?? 0
    return getStrokesOnHole(courseHcp, hole.handicap, holes.length)
  }, [holes, allCourseHandicaps])

  const getPlayerPts = useCallback((playerId: string, holeNumber: number): number => {
    const hole = holes.find(h => h.number === holeNumber)
    if (!hole) return 0
    const received = useGross ? 0 : getPlayerStrokesOnHole(playerId, holeNumber)
    const strokes = allDraftScores[playerId]?.[holeNumber] ?? hole.par
    return computeStablefordPoints(strokes, hole.par, received, tournament.stablefordConfig)
  }, [holes, getPlayerStrokesOnHole, allDraftScores, tournament.stablefordConfig, useGross])

  const getPlayerRunningTotal = useCallback((playerId: string): number => {
    let pts = 0
    for (const hole of holes) {
      const strokes = allDraftScores[playerId]?.[hole.number]
      if (strokes === undefined) continue
      const received = useGross ? 0 : getPlayerStrokesOnHole(playerId, hole.number)
      pts += computeStablefordPoints(strokes, hole.par, received, tournament.stablefordConfig)
    }
    return pts
  }, [holes, getPlayerStrokesOnHole, allDraftScores, tournament.stablefordConfig, useGross])

  // ─── Stableford group: set score ───────────────────────────────────────────
  const setPlayerScore = useCallback((playerId: string, holeNumber: number, strokes: number) => {
    const clamped = Math.max(1, Math.min(12, strokes))
    setAllDraftScores(prev => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? {}), [holeNumber]: clamped },
    }))
    setChangedKeys(prev => new Set([...prev, `${playerId}:${holeNumber}`]))
    setAnimKeys(prev => ({ ...prev, [playerId]: (prev[playerId] ?? 0) + 1 }))
  }, [])

  // ─── Stableford group: save all scores ─────────────────────────────────────
  const handleSaveAll = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const allEntries: Array<{ playerId: string; holeNumber: number; strokes: number }> = []
      for (const player of players) {
        const playerDraft = allDraftScores[player.id] ?? {}
        for (const [holeNumStr, strokes] of Object.entries(playerDraft)) {
          allEntries.push({ playerId: player.id, holeNumber: parseInt(holeNumStr), strokes })
        }
      }

      // Check for existing score rows in parallel
      const checks = await Promise.all(
        allEntries.map(e =>
          supabase.from('scores').select('id')
            .eq('player_id', e.playerId)
            .eq('tournament_id', tournamentId)
            .eq('hole_number', e.holeNumber)
            .maybeSingle()
        )
      )

      // Write all in parallel
      const errors: string[] = []
      await Promise.all(
        allEntries.map(async (e, i) => {
          const now = new Date().toISOString()
          if (checks[i].data) {
            const { error } = await supabase.from('scores')
              .update({ strokes: e.strokes, submitted_at: now })
              .eq('id', checks[i].data!.id)
            if (error) errors.push(error.message)
          } else {
            const { error } = await supabase.from('scores').insert({
              tournament_id: tournamentId,
              player_id: e.playerId,
              hole_number: e.holeNumber,
              strokes: e.strokes,
              submitted_at: now,
            })
            if (error) errors.push(error.message)
          }
        })
      )

      if (errors.length > 0) throw new Error(errors[0])
      setScreen('success')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [saving, players, allDraftScores, supabase, tournamentId])

  // ─── Non-Stableford: save selected player scores ───────────────────────────
  const handleSavePlayer = useCallback(async () => {
    if (!selectedPlayer || savingPlayer) return
    setSavingPlayer(true)
    setSaveErrorPlayer(null)
    try {
      const holesToSave = Object.entries(localScores)
      for (const [holeNumStr, strokes] of holesToSave) {
        const holeNumber = parseInt(holeNumStr)
        const { data: existing } = await supabase.from('scores').select('id')
          .eq('player_id', selectedPlayer.id)
          .eq('tournament_id', tournamentId)
          .eq('hole_number', holeNumber)
          .maybeSingle()
        if (existing) {
          const { error } = await supabase.from('scores')
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
      setSaveErrorPlayer(err instanceof Error ? err.message : 'Save failed. Please try again.')
    } finally {
      setSavingPlayer(false)
    }
  }, [selectedPlayer, savingPlayer, localScores, supabase, tournamentId])

  // ─── Player selection ──────────────────────────────────────────────────────
  const handleSelectPlayer = useCallback((player: PlayerInfo) => {
    setSelectedPlayer(player)
    if (!isStableford) {
      const existing = allScores.filter(s => s.playerId === player.id)
      const prePopulated: Record<number, number> = {}
      existing.forEach(s => { prePopulated[s.holeNumber] = s.strokes })
      holes.forEach(h => { if (!prePopulated[h.number]) prePopulated[h.number] = h.par })
      setLocalScores(prePopulated)
      setSavedHoles(new Set(existing.map(s => s.holeNumber)))
      setSaveErrorPlayer(null)
    }
    setScreen('scoring')
  }, [allScores, holes, isStableford])

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return players
    const q = search.toLowerCase()
    return players.filter(p => p.name.toLowerCase().includes(q))
  }, [players, search])

  // ─── Leaderboard ───────────────────────────────────────────────────────────
  const leaderboard = useMemo(() => {
    return players
      .map(p => {
        const pScores = allScores.filter(s => s.playerId === p.id)
        const pCourseHcp = resolveHandicap(p, tournament, totalPar)
        let totalPts = 0, totalGross = 0, totalNet = 0
        pScores.forEach(s => {
          const hole = holes.find(h => h.number === s.holeNumber)
          if (!hole) return
          const received = useGross ? 0 : getStrokesOnHole(pCourseHcp, hole.handicap, holes.length)
          totalGross += s.strokes
          totalNet += s.strokes - received
          totalPts += computeStablefordPoints(s.strokes, hole.par, received, tournament.stablefordConfig)
        })
        return { ...p, totalPts, totalGross, totalNet, netRelative: totalNet - totalPar, holesCompleted: pScores.length }
      })
      .filter(p => p.holesCompleted > 0)
      .sort((a, b) => {
        if (isStableford) {
          if (b.totalPts !== a.totalPts) return b.totalPts - a.totalPts
          return b.holesCompleted - a.holesCompleted
        }
        if (a.netRelative !== b.netRelative) return a.netRelative - b.netRelative
        return b.holesCompleted - a.holesCompleted
      })
  }, [players, allScores, holes, tournament, totalPar, isStableford, useGross])

  // ─── Icons & StatusBar ─────────────────────────────────────────────────────
  const SunIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
  const MoonIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )

  const StatusBar = () => (
    <div style={{ height: 44, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),#5a3e10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem' }}>⛳</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '0.78rem', color: 'var(--text)' }}>Lotus Links</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {leagueName && (
          <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--font-outfit, sans-serif)', marginRight: '0.25rem' }}>{leagueName}</div>
        )}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, padding: '0 0.5rem', WebkitTapHighlightColor: 'transparent', transition: 'color 0.2s, border-color 0.2s' }}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <a href={`/leaderboard/${tournament.id}`} style={{ fontSize: '0.65rem', color: 'var(--gold)', opacity: 0.7, textDecoration: 'none', lineHeight: 1, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="View Leaderboard">🏆</a>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── RENDER: Pick Screen ──────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (screen === 'pick') {
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), #5a3e10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>⛳</div>
            <span style={{ fontFamily: 'var(--fd)', fontSize: '0.9rem', color: 'var(--gold)' }}>Lotus Links</span>
          </div>

          {leagueName && (
            <div className="section-tag" style={{ marginBottom: '0.5rem' }}>{leagueName}</div>
          )}
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 400, color: 'var(--text)', marginBottom: '0.35rem', lineHeight: 1.15 }}>
            {tournament.name}
          </h1>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {formattedDate} &middot; {tournament.course}
          </div>
          <span className="badge badge-gold" style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}>
            {tournament.format}
          </span>

          {isStableford && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', padding: '0 1.25rem' }}>
              <div style={{ display: 'flex', borderRadius: 20, border: '1px solid var(--gold-border)', overflow: 'hidden', height: 44, width: '100%', maxWidth: 340 }}>
                <button
                  onClick={() => setUseGross(false)}
                  style={{ flex: 1, height: '100%', fontFamily: 'var(--fm)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: !useGross ? 'var(--gold)' : 'transparent', color: !useGross ? '#0a120a' : 'var(--gold)', WebkitTapHighlightColor: 'transparent', transition: 'background 0.15s, color 0.15s' }}
                >
                  Net (Handicap)
                </button>
                <button
                  onClick={() => setUseGross(true)}
                  style={{ flex: 1, height: '100%', fontFamily: 'var(--fm)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', borderLeft: '1px solid var(--gold-border)', background: useGross ? 'var(--gold)' : 'transparent', color: useGross ? '#0a120a' : 'var(--gold)', WebkitTapHighlightColor: 'transparent', transition: 'background 0.15s, color 0.15s' }}
                >
                  Gross
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Player picker */}
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', marginBottom: '0.35rem' }}>
            {isStableford ? "Who's entering scores?" : "Who's scoring?"}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            {isStableford
              ? 'Select your name to score your group hole by hole.'
              : 'Select your name to open your scorecard.'}
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
              <div style={{ fontSize: '0.9rem' }}>No players have been added to this tournament yet. Contact the organizer.</div>
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
                      const received = useGross ? 0 : getStrokesOnHole(pCourseHcp, hole.handicap, holes.length)
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
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 2, textAlign: 'left', width: '100%', fontFamily: 'inherit', color: 'var(--text)', fontSize: 'inherit', minHeight: 56, transition: 'border-color 0.15s', cursor: 'pointer' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--gold)', fontFamily: 'var(--fm)', fontWeight: 600, flexShrink: 0 }}>
                      {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {p.name}
                        {p.handicapIndex == null && (
                          <span title="No Handicap Index — treated as scratch" style={{ fontSize: '0.7rem', color: 'var(--over)', fontFamily: 'var(--fm)' }}>⚠ scratch</span>
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
              <div className="label" style={{ marginBottom: '0.75rem' }}>Current Standings</div>
              <LeaderboardSection leaderboard={leaderboard} holes={holes} highlightPlayerId={null} isStableford={isStableford} />
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <PoweredByFooter />
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── RENDER: Non-Stableford Scrollable Scorecard (unchanged) ─────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isStableford && screen === 'scoring') {
    const holeCount = holes.length
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', ...accentStyle }}>
        {/* Sticky top bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--gold)', fontFamily: 'var(--fm)', fontWeight: 700, flexShrink: 0 }}>
            {selectedPlayer!.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {selectedPlayer!.name}
              {hasNoHandicap && <span title="No Handicap Index — scoring as scratch" style={{ fontSize: '0.65rem', color: 'var(--over)', fontFamily: 'var(--fm)' }}>⚠</span>}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
              Net {fmtRelative(myNetRelative)} · HCP {selectedCourseHandicap}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', flexShrink: 0 }} onClick={() => setScreen('pick')}>
            Change
          </button>
        </div>

        {/* Tournament header */}
        <div style={{ background: 'linear-gradient(180deg, var(--forest) 0%, var(--bg) 100%)', padding: '1.5rem 1.25rem 1rem', textAlign: 'center' }}>
          {leagueName && <div className="section-tag" style={{ marginBottom: '0.35rem' }}>{leagueName}</div>}
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.25rem' }}>{tournament.name}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formattedDate} &middot; {tournament.course}</div>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 1rem 3rem' }}>
          {saveErrorPlayer && (
            <div style={{ background: 'var(--over-dim)', border: '1px solid var(--over-border)', borderRadius: 2, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--over)', animation: 'fadeUp 0.2s ease' }}>
              {saveErrorPlayer}
            </div>
          )}

          {hasNoHandicap && (
            <div style={{ background: 'var(--over-dim)', border: '1px solid var(--over-border)', borderRadius: 4, padding: '0.6rem 0.875rem', marginBottom: '1rem', fontSize: '0.78rem', color: 'var(--over)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠</span>
              <span>No Handicap Index on file — scoring as scratch (0 handicap).</span>
            </div>
          )}

          {/* Scorecard */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '1rem' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: '0.4rem', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'var(--forest)', borderBottom: '1px solid var(--border)' }}>
              {(['Hole', 'Info', 'Strokes', 'Net'] as const).map((h, i) => (
                <div key={h} style={{ fontSize: '0.58rem', color: 'rgba(240,237,230,0.5)', fontFamily: 'var(--fm)', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: i >= 2 ? 'center' : 'left', minWidth: i === 2 ? 96 : i === 3 ? 36 : undefined }}>
                  {h}
                </div>
              ))}
            </div>

            {holes.map((hole, idx) => {
              const gross = localScores[hole.number] ?? hole.par
              const received = getStrokesReceivedSingle(hole.number)
              const net = gross - received
              const netRelative = net - hole.par
              const isSaved = savedHoles.has(hole.number)
              const netColor = netRelative < 0 ? '#4CAF50' : netRelative > 0 ? 'var(--over)' : 'var(--text-muted)'

              return (
                <div key={hole.number} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: '0.4rem', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: idx < holes.length - 1 ? '1px solid var(--border)' : 'none', background: isSaved ? 'transparent' : 'rgba(200,168,75,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface2)', border: `1px solid ${isSaved ? 'var(--border)' : 'var(--gold-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontFamily: 'var(--fm)', color: isSaved ? 'var(--text-muted)' : 'var(--gold)', fontWeight: 600, flexShrink: 0 }}>
                      {hole.number}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                      Par {hole.par}{hole.yardage ? ` · ${hole.yardage}yd` : ''}
                      {received > 0 && <span style={{ color: 'var(--gold)', marginLeft: '0.3rem' }}>+{received}hcp</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', minWidth: 96, justifyContent: 'center' }}>
                    <button
                      onClick={() => setLocalScores(prev => ({ ...prev, [hole.number]: Math.max(1, (prev[hole.number] ?? hole.par) - 1) }))}
                      style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px 0 0 4px', color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1, cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation' }}
                    >−</button>
                    <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface3)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--fm)', fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
                      <span>{gross}</span>
                      {isStrokePlay && received > 0 && <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', lineHeight: 1 }}>net {net}</span>}
                    </div>
                    <button
                      onClick={() => setLocalScores(prev => ({ ...prev, [hole.number]: Math.min(12, (prev[hole.number] ?? hole.par) + 1) }))}
                      style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '0 4px 4px 0', color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1, cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation' }}
                    >+</button>
                  </div>
                  <div style={{ textAlign: 'center', minWidth: 36 }}>
                    <span style={{ fontFamily: 'var(--fd)', fontSize: '1rem', fontWeight: 600, color: netColor }}>{fmtRelative(netRelative)}</span>
                  </div>
                </div>
              )
            })}

            {/* Totals row */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto auto', gap: '0.4rem', alignItems: 'center', padding: '0.75rem', background: 'var(--forest)', borderTop: '1px solid var(--border)' }}>
              <div />
              <div style={{ fontSize: '0.72rem', color: 'rgba(240,237,230,0.6)', fontFamily: 'var(--fm)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Total ({Object.keys(localScores).length}/{holeCount})
              </div>
              <div style={{ minWidth: 96 }} />
              <div style={{ textAlign: 'center', minWidth: 36 }}>
                <span style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', fontWeight: 700, color: myNetRelative < 0 ? '#4CAF50' : myNetRelative > 0 ? 'var(--over)' : 'var(--text-muted)' }}>{fmtRelative(myNetRelative)}</span>
                <div style={{ fontSize: '0.58rem', color: 'rgba(240,237,230,0.4)', fontFamily: 'var(--fm)' }}>net</div>
              </div>
            </div>
          </div>

          <button className="submit-btn" onClick={handleSavePlayer} disabled={savingPlayer} style={{ marginBottom: '0.5rem' }}>
            {savingPlayer ? 'Saving...' : isDirtySingle ? `Save Scores (Net ${fmtRelative(myNetRelative)})` : `Scores Saved ✓ (Net ${fmtRelative(myNetRelative)})`}
          </button>
          {isDirtySingle && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '1.5rem' }}>
              Unsaved changes — tap Save to update the leaderboard
            </div>
          )}

          <div style={{ marginTop: '2rem' }}>
            <div className="label" style={{ marginBottom: '0.75rem' }}>Live Leaderboard</div>
            {leaderboard.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Scores will appear here once players save their scorecards.
              </div>
            ) : (
              <LeaderboardSection leaderboard={leaderboard} holes={holes} highlightPlayerId={selectedPlayer?.id ?? null} isStableford={false} />
            )}
          </div>

          <div style={{ marginTop: '2rem' }}><PoweredByFooter /></div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── RENDER: Stableford Hole-by-Hole Group Scoring ────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const currentHole = holes[holeIdx]
  const isLastHole = holeIdx === holes.length - 1

  if (screen === 'scoring') {
    return (
      <div className={phoneClass} style={accentStyle}>
        <StatusBar />

        {/* Gross/Net toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.4rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <div style={{ display: 'flex', borderRadius: 20, border: '1px solid var(--gold-border)', overflow: 'hidden', height: 44, width: '100%', maxWidth: 340 }}>
            <button
              onClick={() => setUseGross(false)}
              style={{ flex: 1, height: '100%', fontFamily: 'var(--fm)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: !useGross ? 'var(--gold)' : 'transparent', color: !useGross ? '#0a120a' : 'var(--gold)', WebkitTapHighlightColor: 'transparent', transition: 'background 0.15s, color 0.15s' }}
            >
              Net (Handicap)
            </button>
            <button
              onClick={() => setUseGross(true)}
              style={{ flex: 1, height: '100%', fontFamily: 'var(--fm)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', borderLeft: '1px solid var(--gold-border)', background: useGross ? 'var(--gold)' : 'transparent', color: useGross ? '#0a120a' : 'var(--gold)', WebkitTapHighlightColor: 'transparent', transition: 'background 0.15s, color 0.15s' }}
            >
              Gross
            </button>
          </div>
        </div>

        {/* Progress bar + hole counter */}
        <div style={{ padding: '0.6rem 1.25rem 0.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
              {tournament.name}
            </div>
            <div style={{ fontSize: '0.62rem', color: 'var(--gold)', fontFamily: 'var(--fm)', fontWeight: 600, flexShrink: 0 }}>
              Hole {currentHole.number} of {holes.length}
            </div>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${((holeIdx + 1) / holes.length) * 100}%` }} />
          </div>
        </div>

        {/* Hole pill navigator */}
        <div style={{ padding: '0.55rem 1.25rem', borderBottom: '1px solid var(--border)', overflowX: 'auto', WebkitOverflowScrolling: 'touch', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '0.4rem', minWidth: 'max-content' }}>
            {holes.map((h2, i) => {
              const allChanged = players.every(p => changedKeys.has(`${p.id}:${h2.number}`))
              return (
                <button
                  key={i}
                  className={`hole-pill tap ${allChanged ? 'done' : i === holeIdx ? 'active' : 'todo'}`}
                  onClick={() => setHoleIdx(i)}
                >
                  {h2.number}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable scoring area */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Hole info card with chevron navigation */}
          <div style={{ padding: '0.875rem 1.25rem 0.625rem' }}>
            <div style={{ background: 'linear-gradient(135deg,var(--forest),var(--surface2))', border: '1px solid var(--gold-border)', borderRadius: 10, padding: '0.75rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <button
                onClick={() => holeIdx > 0 && setHoleIdx(holeIdx - 1)}
                disabled={holeIdx === 0}
                className="tap"
                style={{ width: 36, height: 36, borderRadius: 8, background: holeIdx === 0 ? 'transparent' : 'var(--surface2)', border: holeIdx === 0 ? 'none' : '1px solid var(--border2)', color: holeIdx === 0 ? 'transparent' : 'var(--text)', fontSize: '1.4rem', cursor: holeIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}
              >
                ‹
              </button>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '0.58rem', color: 'var(--gold)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.1rem', fontFamily: 'var(--fm)' }}>
                  Hole {currentHole.number}
                </div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '2rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1, marginBottom: '0.15rem' }}>
                  {currentHole.number}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                  Par {currentHole.par}
                  {currentHole.handicap != null ? ` · SI ${currentHole.handicap}` : ''}
                  {currentHole.yardage ? ` · ${currentHole.yardage}yd` : ''}
                </div>
              </div>
              <button
                onClick={() => !isLastHole && setHoleIdx(holeIdx + 1)}
                disabled={isLastHole}
                className="tap"
                style={{ width: 36, height: 36, borderRadius: 8, background: isLastHole ? 'transparent' : 'var(--surface2)', border: isLastHole ? 'none' : '1px solid var(--border2)', color: isLastHole ? 'transparent' : 'var(--text)', fontSize: '1.4rem', cursor: isLastHole ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}
              >
                ›
              </button>
            </div>
          </div>

          {/* Player rows */}
          <div style={{ padding: '0 1.25rem 0.625rem' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              {players.map((player, pIdx) => {
                const strokes = allDraftScores[player.id]?.[currentHole.number] ?? currentHole.par
                const received = getPlayerStrokesOnHole(player.id, currentHole.number)
                const pts = getPlayerPts(player.id, currentHole.number)
                const badge = ptsBadgeStyle(pts)
                const animKey = animKeys[player.id] ?? 0
                const isScorer = selectedPlayer?.id === player.id
                const hasChanged = changedKeys.has(`${player.id}:${currentHole.number}`)

                return (
                  <div
                    key={player.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: '0.5rem',
                      alignItems: 'center',
                      padding: '0.55rem 0.75rem',
                      borderBottom: pIdx < players.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isScorer ? 'rgba(200,168,75,0.06)' : 'transparent',
                      opacity: hasChanged ? 1 : 0.75,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {/* Name + hcp badge */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', color: isScorer ? 'var(--gold)' : 'var(--text)', fontWeight: isScorer ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {player.name.split(' ')[0]}
                        {isScorer && <span style={{ fontSize: '0.56rem', fontFamily: 'var(--fm)', color: 'var(--gold)', marginLeft: '0.3rem' }}>(you)</span>}
                      </div>
                      {received > 0 && !useGross && (
                        <div style={{ fontSize: '0.6rem', color: 'var(--gold)', fontFamily: 'var(--fm)', marginTop: '0.05rem', lineHeight: 1 }}>
                          +{received}hcp
                        </div>
                      )}
                    </div>

                    {/* Compact stepper with pop animation keyed by player */}
                    <div key={animKey} style={{ display: 'flex', alignItems: 'center', animation: animKey > 0 ? 'pop 0.22s ease' : 'none' }}>
                      <button
                        className="tap"
                        onClick={() => setPlayerScore(player.id, currentHole.number, strokes - 1)}
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--over-dim)', border: '1.5px solid var(--over-border)', borderRadius: '6px 0 0 6px', color: 'var(--over)', fontSize: '1rem', cursor: 'pointer', touchAction: 'manipulation', flexShrink: 0, lineHeight: 1 }}
                      >−</button>
                      <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface3)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--fm)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                        {strokes}
                      </div>
                      <button
                        className="tap"
                        onClick={() => setPlayerScore(player.id, currentHole.number, strokes + 1)}
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gold-dim)', border: '1.5px solid var(--gold-border)', borderRadius: '0 6px 6px 0', color: 'var(--gold)', fontSize: '1rem', cursor: 'pointer', touchAction: 'manipulation', flexShrink: 0, lineHeight: 1 }}
                      >+</button>
                    </div>

                    {/* Points badge */}
                    <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.18rem 0.35rem', borderRadius: 20, background: badge.bg, color: badge.color, fontSize: badge.fontSize, fontWeight: badge.fontWeight, fontFamily: 'var(--fm)', minWidth: 36, transition: 'all 0.18s' }}>
                        {pts}{pts === 1 ? 'pt' : 'pts'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Running totals */}
          <div style={{ padding: '0 1.25rem 0.625rem' }}>
            <div style={{ fontSize: '0.56rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Running Totals
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {players.map(player => {
                const total = getPlayerRunningTotal(player.id)
                const isScorer = selectedPlayer?.id === player.id
                return (
                  <div
                    key={player.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: isScorer ? 'var(--gold-dim)' : 'var(--surface)', border: `1px solid ${isScorer ? 'var(--gold-border)' : 'var(--border)'}`, borderRadius: 20, padding: '0.2rem 0.55rem' }}
                  >
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 60 }}>
                      {player.name.split(' ')[0]}
                    </span>
                    <span style={{ fontFamily: 'var(--fd)', fontSize: '0.88rem', color: 'var(--gold)', fontWeight: 700 }}>{total}</span>
                    <span style={{ fontSize: '0.56rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>pts</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Save error */}
          {saveError && (
            <div style={{ margin: '0 1.25rem 0.625rem', background: 'var(--over-dim)', border: '1px solid var(--over-border)', borderRadius: 4, padding: '0.65rem 0.875rem', fontSize: '0.8rem', color: 'var(--over)' }}>
              {saveError}
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ padding: '0 1.25rem 1.5rem', display: 'flex', gap: '0.5rem' }}>
            {holeIdx > 0 && (
              <button className="submit-btn ghost tap" onClick={() => setHoleIdx(holeIdx - 1)} style={{ flex: 1 }}>
                ← Prev
              </button>
            )}
            {isLastHole ? (
              <button className="submit-btn tap" onClick={() => setScreen('review')} style={{ flex: holeIdx > 0 ? 2 : 1 }}>
                Review & Save →
              </button>
            ) : (
              <button className="submit-btn tap" onClick={() => setHoleIdx(holeIdx + 1)} style={{ flex: holeIdx > 0 ? 2 : 1 }}>
                Next Hole →
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── RENDER: Stableford Review Screen ────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  if (screen === 'review') {
    return (
      <div className={phoneClass} style={accentStyle}>
        <StatusBar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', animation: 'fadeUp 0.35s ease' }}>
          <div style={{ padding: '1.25rem 1.25rem 0' }}>
            <button
              onClick={() => setScreen('scoring')}
              className="tap"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}
            >
              ← Edit Scores
            </button>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.35rem', color: 'var(--text)', marginBottom: '0.2rem' }}>Review Scorecards</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {tournament.name} &middot; {players.length} players
            </div>
          </div>

          {/* Per-player summary cards */}
          <div style={{ padding: '0 1.25rem' }}>
            {players.map(player => {
              const courseHcp = allCourseHandicaps[player.id] ?? 0
              let grandTotal = 0
              const holeBreakdown = holes.map(hole => {
                const strokes = allDraftScores[player.id]?.[hole.number] ?? hole.par
                const received = getPlayerStrokesOnHole(player.id, hole.number)
                const pts = computeStablefordPoints(strokes, hole.par, received, tournament.stablefordConfig)
                grandTotal += pts
                return { hole, strokes, pts }
              })

              return (
                <div key={player.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: '0.75rem', overflow: 'hidden' }}>
                  {/* Player header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.875rem', background: 'var(--forest)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--gold)', fontFamily: 'var(--fm)', fontWeight: 700, flexShrink: 0 }}>
                        {player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.2 }}>{player.name}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>HCP {courseHcp}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.4rem', color: 'var(--gold)', fontWeight: 700, lineHeight: 1 }}>{grandTotal}</div>
                      <div style={{ fontSize: '0.56rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>pts total</div>
                    </div>
                  </div>

                  {/* Hole breakdown */}
                  <div style={{ padding: '0.5rem 0.875rem 0.625rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {holeBreakdown.map(({ hole, strokes, pts }) => {
                      const b = ptsBadgeStyle(pts)
                      return (
                        <div key={hole.number} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.05rem', minWidth: 26 }}>
                          <div style={{ fontSize: '0.52rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>H{hole.number}</div>
                          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--fm)', color: 'var(--text-muted)', fontWeight: 500 }}>{strokes}</div>
                          <div style={{ fontSize: '0.58rem', fontFamily: 'var(--fm)', color: b.color, fontWeight: b.fontWeight }}>{pts}p</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', textAlign: 'center', padding: '0.25rem 1.25rem 0.75rem', lineHeight: 1.5, fontStyle: 'italic' }}>
            Once saved, scores go live on the leaderboard.
          </div>

          {saveError && (
            <div style={{ margin: '0 1.25rem 0.75rem', background: 'var(--over-dim)', border: '1px solid var(--over-border)', borderRadius: 4, padding: '0.65rem 0.875rem', fontSize: '0.8rem', color: 'var(--over)' }}>
              {saveError}
            </div>
          )}

          <div style={{ padding: '0 1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="submit-btn" onClick={handleSaveAll} disabled={saving}>
              {saving ? 'Saving...' : '✓ Save All Scorecards'}
            </button>
            <button className="submit-btn ghost" onClick={() => setScreen('scoring')}>
              ← Go Back &amp; Edit
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── RENDER: Stableford Success Screen ───────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className={phoneClass} style={accentStyle}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem', textAlign: 'center', animation: 'fadeUp 0.5s ease', position: 'relative' }}>
        {confetti.map(c => (
          <div key={c.id} className="confetti-p" style={{ left: c.left, top: '-10px', background: c.color, width: c.size, height: c.size, animationDelay: c.delay }} />
        ))}

        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem', animation: 'pop 0.5s ease 0.2s both' }}>🏆</div>

        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.65rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.35rem' }}>
          Scorecards Saved!
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--gold)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          {tournament.name}
        </div>

        {/* Per-player totals */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
          {players
            .map(p => ({ player: p, total: getPlayerRunningTotal(p.id) }))
            .sort((a, b) => b.total - a.total)
            .map(({ player, total }, i) => (
              <div
                key={player.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: i === 0 ? 'var(--gold-dim)' : 'var(--surface)', border: `1px solid ${i === 0 ? 'var(--gold-border)' : 'var(--border)'}`, borderRadius: 8, padding: '0.55rem 0.875rem', animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {i === 0 && <span style={{ fontSize: '0.9rem' }}>🥇</span>}
                  {i === 1 && <span style={{ fontSize: '0.9rem' }}>🥈</span>}
                  {i === 2 && <span style={{ fontSize: '0.9rem' }}>🥉</span>}
                  <div style={{ fontSize: '0.88rem', color: i === 0 ? 'var(--gold)' : 'var(--text)', fontWeight: i === 0 ? 600 : 400 }}>{player.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', color: 'var(--gold)', fontWeight: 700 }}>{total}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>pts</span>
                </div>
              </div>
            ))}
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Scores are now live on the leaderboard.
        </div>

        <a
          href={`/leaderboard/${tournament.id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 8, color: 'var(--gold)', fontFamily: 'var(--fd)', fontSize: '1rem', textDecoration: 'none', marginBottom: '1rem' }}
        >
          View Live Leaderboard →
        </a>

        <PoweredByFooter />
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
      <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 52px 56px', gap: '0.5rem', alignItems: 'center', padding: '0.4rem 0.75rem' }}>
        {(['Pos', 'Player', 'Thru', isStableford ? 'Pts' : 'Net'] as const).map((h, i) => (
          <div key={h} style={{ fontSize: '0.58rem', letterSpacing: '0.15em', color: 'var(--text-dim)', fontFamily: 'var(--fm)', textTransform: 'uppercase', textAlign: i >= 2 ? 'center' : 'left' }}>
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
            style={{ display: 'grid', gridTemplateColumns: '32px 1fr 52px 56px', gap: '0.5rem', alignItems: 'center', padding: '0.65rem 0.75rem', borderRadius: 4, background: isMe ? 'var(--gold-dim)' : isLeader ? 'linear-gradient(90deg, rgba(200,168,75,0.06), transparent)' : 'var(--surface)', border: `1px solid ${isMe ? 'var(--gold-border)' : isLeader ? 'var(--gold-border)' : 'var(--border)'}`, animation: `fadeUp 0.35s ease ${i * 0.04}s both` }}
          >
            <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontFamily: 'var(--fm)', fontWeight: 700, background: i === 0 ? 'var(--gold)' : i === 1 ? 'rgba(192,192,192,0.3)' : i === 2 ? 'rgba(180,120,60,0.3)' : 'var(--surface2)', color: i === 0 ? '#0a120a' : i === 1 ? '#d0d0d0' : i === 2 ? '#c87830' : 'var(--text-dim)' }}>
              {i + 1}
            </div>

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

            <div style={{ textAlign: 'center' }}>
              {isFinished
                ? <span className="badge badge-gold" style={{ fontSize: '0.58rem' }}>F</span>
                : <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>{entry.holesCompleted}/{holes.length}</span>}
            </div>

            <div style={{ textAlign: 'center' }}>
              {isStableford ? (
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.2rem', fontWeight: 600, color: isLeader ? 'var(--gold)' : 'var(--text)' }}>{entry.totalPts}</div>
              ) : (
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', fontWeight: 600, color: entry.netRelative < 0 ? '#4CAF50' : entry.netRelative > 0 ? 'var(--over)' : 'var(--text-muted)' }}>{fmtRelative(entry.netRelative)}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
