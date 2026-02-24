'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { adminUpdateScore, toggleLeaderboardPublic } from '@/lib/actions/scores'

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
  pin: string
}

interface ScoreInfo {
  id: string
  groupId: string
  holeNumber: number
  strokes: number
  enteredBy: string | null
  submittedAt: string
}

interface ScoresMonitorProps {
  tournamentId: string
  leagueId: string
  tournament: {
    name: string
    holeCount: number
    leaderboardPublic: boolean
  }
  holes: HoleInfo[]
  groups: GroupInfo[]
  scores: ScoreInfo[]
}

function fmtRelative(n: number) {
  if (n === 0) return 'E'
  if (n > 0) return `+${n}`
  return String(n)
}

export default function ScoresMonitor({
  tournamentId,
  leagueId,
  tournament,
  holes,
  groups,
  scores,
}: ScoresMonitorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingScore, setEditingScore] = useState<{ groupId: string; holeNumber: number; current: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [leaderboardPublic, setLeaderboardPublic] = useState(tournament.leaderboardPublic)

  const totalPar = holes.reduce((a, h) => a + h.par, 0)

  // Build group summaries
  const groupSummaries = useMemo(() => {
    return groups.map(g => {
      const groupScores = scores.filter(s => s.groupId === g.id)
      const holesCompleted = groupScores.length
      const totalStrokes = groupScores.reduce((a, s) => a + s.strokes, 0)
      const parForCompleted = groupScores.reduce((a, s) => {
        const hole = holes.find(h => h.number === s.holeNumber)
        return a + (hole?.par ?? 3)
      }, 0)
      const scoreToPar = totalStrokes - parForCompleted

      return {
        ...g,
        holesCompleted,
        totalStrokes,
        scoreToPar,
        scores: groupScores,
      }
    }).sort((a, b) => {
      // Active groups first, then by score
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1
      if (a.holesCompleted > 0 && b.holesCompleted === 0) return -1
      if (b.holesCompleted > 0 && a.holesCompleted === 0) return 1
      return a.scoreToPar - b.scoreToPar
    })
  }, [groups, scores, holes])

  const activeGroups = groupSummaries.filter(g => g.status === 'in_progress')
  const completedGroups = groupSummaries.filter(g => g.status === 'completed')
  const notStartedGroups = groupSummaries.filter(g => g.status === 'not_started' && g.holesCompleted === 0)

  const handleToggleLeaderboard = () => {
    const newValue = !leaderboardPublic
    setLeaderboardPublic(newValue)
    startTransition(async () => {
      try {
        await toggleLeaderboardPublic(tournamentId, newValue)
        setSuccess(newValue ? 'Leaderboard is now live and publicly accessible' : 'Leaderboard is now hidden from public')
        setTimeout(() => setSuccess(null), 2500)
        router.refresh()
      } catch (e) {
        setLeaderboardPublic(!newValue)
        setError(e instanceof Error ? e.message : 'Failed to toggle leaderboard')
      }
    })
  }

  const handleEditScore = (groupId: string, holeNumber: number, currentStrokes: number) => {
    setEditingScore({ groupId, holeNumber, current: currentStrokes })
    setEditValue(String(currentStrokes))
  }

  const handleSaveScore = () => {
    if (!editingScore) return
    const strokes = parseInt(editValue)
    if (isNaN(strokes) || strokes < 1 || strokes > 12) {
      setError('Score must be between 1 and 12')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await adminUpdateScore({
          tournamentId,
          groupId: editingScore.groupId,
          holeNumber: editingScore.holeNumber,
          strokes,
        })
        setEditingScore(null)
        setSuccess('Score updated')
        setTimeout(() => setSuccess(null), 2000)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update score')
      }
    })
  }

  const leaderboardUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/leaderboard/${tournamentId}`
    : `/leaderboard/${tournamentId}`

  const [copiedLink, setCopiedLink] = useState(false)
  const handleCopyLink = () => {
    navigator.clipboard.writeText(leaderboardUrl).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    })
  }

  return (
    <div>
      {/* Error / Success */}
      {error && (
        <div style={{ background: 'var(--over-dim)', border: '1px solid var(--over-border)', borderRadius: 2, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--over)' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(45,140,69,0.12)', border: '1px solid rgba(45,140,69,0.3)', borderRadius: 2, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#4CAF50', animation: 'fadeUp 0.3s ease' }}>
          {success}
        </div>
      )}

      {/* Leaderboard toggle & link */}
      <div className="card card-gold" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              Public Leaderboard
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', wordBreak: 'break-all' }}>
              {leaderboardUrl}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href={`/leaderboard/${tournamentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              style={{ textDecoration: 'none' }}
            >
              View Leaderboard ↗
            </a>
            <button
              className={`btn ${copiedLink ? 'btn-gold' : 'btn-outline'} btn-sm`}
              onClick={handleCopyLink}
            >
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              className={`btn ${leaderboardPublic ? 'btn-gold' : 'btn-outline'} btn-sm`}
              onClick={handleToggleLeaderboard}
              disabled={isPending}
            >
              {leaderboardPublic ? 'Live' : 'Hidden'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats overview */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 100, textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontFamily: 'var(--fm)', fontSize: '1.5rem', color: 'var(--gold)' }}>{groups.length}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>Groups</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 100, textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontFamily: 'var(--fm)', fontSize: '1.5rem', color: '#4CAF50' }}>{activeGroups.length}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>In Progress</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 100, textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontFamily: 'var(--fm)', fontSize: '1.5rem', color: 'var(--gold)' }}>{completedGroups.length}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>Finished</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 100, textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontFamily: 'var(--fm)', fontSize: '1.5rem', color: 'var(--text-muted)' }}>Par {totalPar}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>{holes.length} holes</div>
        </div>
      </div>

      {/* Group cards */}
      {groupSummaries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderStyle: 'dashed', borderColor: 'var(--border2)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: '0.5rem' }}>No Groups Yet</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Create groups first, then scores will appear here as chaperones submit them.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Active groups */}
          {activeGroups.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="section-tag">In Progress</span>
                <span className="badge badge-green pulse">LIVE</span>
              </div>
              <div className="g2">
                {activeGroups.map(g => (
                  <GroupScoreCard
                    key={g.id}
                    group={g}
                    holes={holes}
                    editingScore={editingScore}
                    editValue={editValue}
                    onEditScore={handleEditScore}
                    onEditValueChange={setEditValue}
                    onSaveScore={handleSaveScore}
                    onCancelEdit={() => setEditingScore(null)}
                    isPending={isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed groups */}
          {completedGroups.length > 0 && (
            <div>
              <div className="section-tag" style={{ marginBottom: '0.75rem' }}>Completed</div>
              <div className="g2">
                {completedGroups.map(g => (
                  <GroupScoreCard
                    key={g.id}
                    group={g}
                    holes={holes}
                    editingScore={editingScore}
                    editValue={editValue}
                    onEditScore={handleEditScore}
                    onEditValueChange={setEditValue}
                    onSaveScore={handleSaveScore}
                    onCancelEdit={() => setEditingScore(null)}
                    isPending={isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Not started groups */}
          {notStartedGroups.length > 0 && (
            <div>
              <div className="section-tag" style={{ marginBottom: '0.75rem' }}>Not Started</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {notStartedGroups.map(g => (
                  <div key={g.id} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.9rem' }}>{g.name}</div>
                    {g.chaperoneName && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>{g.chaperoneName}</span>
                    )}
                    <span className="badge badge-gray">Waiting</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score edit modal */}
      {editingScore && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }} onClick={() => setEditingScore(null)}>
          <div className="card card-gold" style={{ maxWidth: 340, width: '100%', animation: 'fadeUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Edit Score
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {groups.find(g => g.id === editingScore.groupId)?.name} — Hole {editingScore.holeNumber}
              {' '}(Par {holes.find(h => h.number === editingScore.holeNumber)?.par ?? 3})
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="label" style={{ marginBottom: 0 }}>Strokes</div>
              <input
                className="input"
                type="number"
                min="1"
                max="12"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveScore()}
                style={{ width: 80, textAlign: 'center', fontSize: '1.25rem', fontFamily: 'var(--fd)' }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-gold btn-sm" onClick={handleSaveScore} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingScore(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Group Score Card ──────────────────────────────────────────────────────────

interface GroupScoreCardProps {
  group: {
    id: string
    name: string
    chaperoneName: string | null
    currentHole: number
    status: string
    holesCompleted: number
    totalStrokes: number
    scoreToPar: number
    scores: ScoreInfo[]
  }
  holes: HoleInfo[]
  editingScore: { groupId: string; holeNumber: number; current: number } | null
  editValue: string
  onEditScore: (groupId: string, holeNumber: number, currentStrokes: number) => void
  onEditValueChange: (value: string) => void
  onSaveScore: () => void
  onCancelEdit: () => void
  isPending: boolean
}

function GroupScoreCard({ group, holes, onEditScore }: GroupScoreCardProps) {
  const isActive = group.status === 'in_progress'
  const isCompleted = group.status === 'completed'

  return (
    <div
      className="card"
      style={{
        borderTop: `2px solid ${isActive ? 'rgba(76,175,80,0.5)' : isCompleted ? 'var(--gold-border)' : 'var(--border)'}`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', color: 'var(--text)' }}>
            {group.name}
          </div>
          {group.chaperoneName && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', marginTop: '0.1rem' }}>
              {group.chaperoneName}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            {isActive && <span className="badge badge-green" style={{ fontSize: '0.55rem' }}>LIVE</span>}
            {isCompleted && <span className="badge badge-gold" style={{ fontSize: '0.55rem' }}>DONE</span>}
            <span style={{
              fontFamily: 'var(--fd)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: group.scoreToPar < 0 ? '#4CAF50' : group.scoreToPar > 0 ? 'var(--over)' : 'var(--text-muted)',
            }}>
              {group.holesCompleted > 0 ? fmtRelative(group.scoreToPar) : '—'}
            </span>
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
            {group.holesCompleted}/{holes.length} holes &middot; {group.totalStrokes} strokes
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ marginBottom: '0.75rem' }}>
        <div
          className="progress-fill"
          style={{ width: `${(group.holesCompleted / holes.length) * 100}%` }}
        />
      </div>

      {/* Hole scores grid */}
      {group.scores.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {holes.map(h => {
            const score = group.scores.find(s => s.holeNumber === h.number)
            if (!score) {
              return (
                <div
                  key={h.number}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    fontFamily: 'var(--fm)',
                    background: 'var(--surface2)',
                    color: 'var(--text-dim)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {h.number}
                </div>
              )
            }
            const d = score.strokes - h.par
            return (
              <button
                key={h.number}
                onClick={() => onEditScore(group.id, h.number, score.strokes)}
                className="tap"
                title={`Hole ${h.number}: ${score.strokes} (Par ${h.par}) — Click to edit`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  fontFamily: 'var(--fm)',
                  cursor: 'pointer',
                  background: d < 0 ? 'rgba(76,175,80,0.2)' : d === 0 ? 'var(--surface2)' : 'var(--over-dim)',
                  color: d < 0 ? '#4CAF50' : d === 0 ? 'var(--text-muted)' : 'var(--over)',
                  border: d < 0 ? '1px solid rgba(76,175,80,0.3)' : d === 0 ? '1px solid var(--border)' : '1px solid var(--over-border)',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'transform 0.15s',
                }}
              >
                {score.strokes}
              </button>
            )
          })}
        </div>
      )}

      {/* Hole legend */}
      {group.scores.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          {holes.map(h => (
            <div
              key={h.number}
              style={{
                width: 32,
                textAlign: 'center',
                fontSize: '0.5rem',
                color: 'var(--text-dim)',
                fontFamily: 'var(--fm)',
              }}
            >
              H{h.number}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
