'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Player } from '@/lib/types'
import { addPlayer, bulkAddPlayers, deletePlayer, checkInPlayer, undoCheckIn, updatePlayer } from '@/lib/actions/players'
import CsvImportDialog from './CsvImportDialog'
import { getBaseUrl } from '@/lib/url'

interface PlayersManagerProps {
  tournamentId: string
  leagueId: string
  players: Player[]
  pairingPrefs: { player_id: string; preferred_player_id: string }[]
  isWish?: boolean
}

export default function PlayersManager({
  tournamentId,
  leagueId,
  players,
  pairingPrefs,
  isWish = false,
}: PlayersManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [showCsv, setShowCsv] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [newHandicapIndex, setNewHandicapIndex] = useState('')
  const [newSkillLevel, setNewSkillLevel] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'grade' | 'status'>('name')
  const [filterVolunteers, setFilterVolunteers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null)
  const [editPlayerName, setEditPlayerName] = useState('')
  const [editPlayerGrade, setEditPlayerGrade] = useState('')
  const [editPlayerHandicap, setEditPlayerHandicap] = useState('0')
  const [editPlayerHandicapIndex, setEditPlayerHandicapIndex] = useState('')
  const [editPlayerSkill, setEditPlayerSkill] = useState('')

  const registeredCount = players.filter(p => p.status === 'registered' || p.status === 'checked_in').length
  const checkedInCount = players.filter(p => p.status === 'checked_in').length

  // Build pairing prefs map: playerId -> count of preferences
  const prefCountMap = new Map<string, number>()
  for (const pref of pairingPrefs) {
    prefCountMap.set(pref.player_id, (prefCountMap.get(pref.player_id) ?? 0) + 1)
  }

  const volunteerCount = players.filter(p => (p as any).willing_to_chaperone).length

  // Filter and sort
  const filtered = players.filter(p => {
    if (!p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterVolunteers && !(p as any).willing_to_chaperone) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'grade') return (a.grade ?? '').localeCompare(b.grade ?? '')
    if (sortBy === 'status') return a.status.localeCompare(b.status)
    return 0
  })

  const handleAdd = () => {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        if (isWish) {
          await addPlayer(tournamentId, newName, newGrade)
        } else {
          const hdcpIdx = newHandicapIndex !== '' ? parseFloat(newHandicapIndex) : null
          await addPlayer(tournamentId, newName, undefined, {
            handicap_index: hdcpIdx != null && !isNaN(hdcpIdx) ? hdcpIdx : null,
            skill_level: newSkillLevel || null,
          })
        }
        setNewName('')
        setNewGrade('')
        setNewHandicapIndex('')
        setNewSkillLevel('')
        setShowAdd(false)
        setSuccess('Player added')
        setTimeout(() => setSuccess(null), 2000)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add player')
      }
    })
  }

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await bulkAddPlayers(tournamentId, bulkText)
        setBulkText('')
        setShowBulk(false)
        setSuccess(`Added ${result.added} players`)
        setTimeout(() => setSuccess(null), 3000)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add players')
      }
    })
  }

  const handleDelete = (playerId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        await deletePlayer(playerId)
        setConfirmDelete(null)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete player')
      }
    })
  }

  const handleCheckIn = (playerId: string) => {
    startTransition(async () => {
      try {
        await checkInPlayer(playerId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to check in player')
      }
    })
  }

  const handleUndoCheckIn = (playerId: string) => {
    startTransition(async () => {
      try {
        await undoCheckIn(playerId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to undo check-in')
      }
    })
  }

  const handleCopyLink = () => {
    const url = `${getBaseUrl()}/register/${tournamentId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const startEdit = (p: Player) => {
    setEditPlayerId(p.id)
    setEditPlayerName(p.name)
    setEditPlayerGrade(p.grade ?? '')
    setEditPlayerHandicap(String(p.handicap ?? 0))
    setEditPlayerHandicapIndex(p.handicap_index != null ? String(p.handicap_index) : '')
    setEditPlayerSkill(p.skill_level ?? '')
  }

  const handleEditSave = () => {
    if (!editPlayerId || !editPlayerName.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        if (isWish) {
          await updatePlayer(editPlayerId, {
            name: editPlayerName,
            grade: editPlayerGrade || null,
          })
        } else {
          const hdcpIdx = editPlayerHandicapIndex !== '' ? parseFloat(editPlayerHandicapIndex) : null
          await updatePlayer(editPlayerId, {
            name: editPlayerName,
            handicap_index: hdcpIdx != null && !isNaN(hdcpIdx) ? hdcpIdx : null,
            skill_level: editPlayerSkill || null,
          })
        }
        setEditPlayerId(null)
        setSuccess('Player updated')
        setTimeout(() => setSuccess(null), 2000)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update player')
      }
    })
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <span className="badge badge-green">Registered</span>
      case 'checked_in':
        return <span className="badge badge-gold">Checked In</span>
      default:
        return <span className="badge badge-gray">Pre-registered</span>
    }
  }

  return (
    <div>
      {/* Registration link banner */}
      <div
        className="card card-gold"
        style={{ marginBottom: '1.5rem', animation: 'fadeUp 0.3s ease' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              {isWish ? 'Parent Registration Link' : 'Registration Link'}
            </div>
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--fm)',
                wordBreak: 'break-all',
              }}
            >
              {`${getBaseUrl()}/register/${tournamentId}`}
            </div>
          </div>
          <button
            className={`btn ${copied ? 'btn-gold' : 'btn-outline'} btn-sm`}
            onClick={handleCopyLink}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <span className="section-tag">Roster</span>
          <div className="gold-divider" />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
          <span className="badge badge-gold">{players.length} total</span>
          <span className="badge badge-green">{registeredCount} registered</span>
          {checkedInCount > 0 && (
            <span className="badge badge-gold">{checkedInCount} checked in</span>
          )}
          {players.length > 0 && (
            <div style={{ flex: 1, minWidth: 120, maxWidth: 200 }}>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${players.length > 0 ? (registeredCount / players.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-gold btn-sm" onClick={() => { setShowAdd(true); setShowBulk(false) }}>
          + Add Player
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => { setShowBulk(true); setShowAdd(false) }}>
          Bulk Add
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowCsv(true)}>
          Import CSV
        </button>
        {volunteerCount > 0 && (
          <button
            className={`btn ${filterVolunteers ? 'btn-gold' : 'btn-ghost'} btn-sm`}
            onClick={() => setFilterVolunteers(!filterVolunteers)}
            style={{ marginLeft: 'auto' }}
          >
            🙋 Volunteers ({volunteerCount})
          </button>
        )}
      </div>

      {/* Error / Success */}
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
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: 'rgba(45,140,69,0.12)',
            border: '1px solid rgba(45,140,69,0.3)',
            borderRadius: 2,
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.82rem',
            color: '#4CAF50',
            animation: 'fadeUp 0.3s ease',
          }}
        >
          {success}
        </div>
      )}

      {/* Add single player form */}
      {showAdd && (
        <div className="card card-gold" style={{ marginBottom: '1.25rem', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '1rem' }}>
            Add New Player
          </div>
          <div className="g2" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="label">Full Name</div>
              <input
                className="input"
                placeholder="Player name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
            </div>
            {isWish ? (
              <div>
                <div className="label">Grade (optional)</div>
                <input
                  className="input"
                  placeholder="e.g. 5th"
                  value={newGrade}
                  onChange={e => setNewGrade(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
            ) : (
              <div>
                <div className="label">Handicap Index (optional)</div>
                <input
                  className="input"
                  type="number"
                  min="-10"
                  max="54"
                  step="0.1"
                  placeholder="e.g. 12.4"
                  value={newHandicapIndex}
                  onChange={e => setNewHandicapIndex(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
            )}
          </div>
          {!isWish && (
            <div style={{ marginBottom: '1rem' }}>
              <div className="label">Skill Level (optional)</div>
              <select
                className="input"
                value={newSkillLevel}
                onChange={e => setNewSkillLevel(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">— Select skill level —</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-gold" onClick={handleAdd} disabled={isPending}>
              {isPending ? 'Adding...' : 'Add Player'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk add form */}
      {showBulk && (
        <div className="card card-gold" style={{ marginBottom: '1.25rem', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Bulk Add Players
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Paste names — one per line, or comma-separated
          </div>
          <textarea
            className="input"
            rows={6}
            placeholder={"John Smith\nJane Doe\nAlex Johnson"}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'var(--fm)', fontSize: '0.85rem' }}
          />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.35rem', marginBottom: '0.75rem', fontFamily: 'var(--fm)' }}>
            {bulkText.split(/[\n,]/).filter(n => n.trim()).length} names detected
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-gold" onClick={handleBulkAdd} disabled={isPending || !bulkText.trim()}>
              {isPending ? 'Adding...' : 'Add All'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowBulk(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and sort */}
      {players.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              className="input"
              placeholder="Search players..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          <select
            className="input"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'name' | 'grade' | 'status')}
            style={{ width: 'auto', minWidth: 130, fontSize: '0.85rem' }}
          >
            <option value="name">Sort by Name</option>
            {isWish && <option value="grade">Sort by Grade</option>}
            <option value="status">Sort by Status</option>
          </select>
        </div>
      )}

      {/* Player table */}
      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderStyle: 'dashed', borderColor: 'var(--border2)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👤</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
            {search ? 'No Players Match' : 'No Players Yet'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {search ? 'Try a different search term.' : 'Add players manually, bulk add, or import from CSV.'}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--forest)' }}>
                  {[
                    'Player',
                    isWish ? 'Grade' : 'Hdcp / Skill',
                    'Status',
                    ...(isWish ? ['Parent'] : []),
                    'Pairings',
                    '',
                  ].map(h => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '0.6rem 0.75rem',
                        fontSize: '0.65rem',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        color: 'var(--gold)',
                        fontFamily: 'var(--fm)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(p => (
                  editPlayerId === p.id ? (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input
                          className="input"
                          value={editPlayerName}
                          onChange={e => setEditPlayerName(e.target.value)}
                          style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
                          autoFocus
                        />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        {isWish ? (
                          <input
                            className="input"
                            value={editPlayerGrade}
                            onChange={e => setEditPlayerGrade(e.target.value)}
                            placeholder="Grade"
                            style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem', width: 80 }}
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <input
                              className="input"
                              type="number"
                              min="-10"
                              max="54"
                              step="0.1"
                              value={editPlayerHandicapIndex}
                              onChange={e => setEditPlayerHandicapIndex(e.target.value)}
                              placeholder="Hdcp"
                              style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem', width: 70 }}
                            />
                            <select
                              className="input"
                              value={editPlayerSkill}
                              onChange={e => setEditPlayerSkill(e.target.value)}
                              style={{ fontSize: '0.82rem', padding: '0.35rem 0.5rem', width: 110 }}
                            >
                              <option value="">— Skill —</option>
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                              <option value="pro">Pro</option>
                            </select>
                          </div>
                        )}
                      </td>
                      <td colSpan={isWish ? 4 : 3} style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-gold btn-sm"
                            style={{ fontSize: '0.65rem' }}
                            onClick={handleEditSave}
                            disabled={isPending || !editPlayerName.trim()}
                          >
                            {isPending ? '...' : 'Save'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => setEditPlayerId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'var(--surface3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              color: 'var(--gold)',
                              flexShrink: 0,
                              fontFamily: 'var(--fm)',
                            }}
                          >
                            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{p.name}</div>
                          {(p as any).willing_to_chaperone && (
                            <span className="badge badge-gold" style={{ fontSize: '0.5rem', padding: '0.1rem 0.35rem' }} title="Parent volunteered to chaperone">
                              🙋 Volunteer
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {isWish ? (
                          p.grade || '—'
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontFamily: 'var(--fm)', fontSize: '0.78rem' }}>
                              {p.handicap_index != null ? `${p.handicap_index} hdcp` : '—'}
                            </span>
                            {p.skill_level && (
                              <span className="badge badge-gray" style={{ fontSize: '0.5rem', textTransform: 'capitalize' }}>
                                {p.skill_level}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {statusBadge(p.status)}
                          {p.status === 'registered' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', color: '#4CAF50' }}
                              onClick={() => handleCheckIn(p.id)}
                              disabled={isPending}
                              title="Check in player"
                            >
                              Check In
                            </button>
                          )}
                          {p.status === 'checked_in' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', color: 'var(--text-dim)' }}
                              onClick={() => handleUndoCheckIn(p.id)}
                              disabled={isPending}
                              title="Undo check-in"
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      </td>
                      {isWish && (
                        <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <div>{p.parent_name || '—'}</div>
                          {p.registration_comments && (
                            <div style={{
                              fontSize: '0.72rem',
                              color: 'var(--gold)',
                              fontFamily: 'var(--fm)',
                              marginTop: '0.2rem',
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }} title={p.registration_comments}>
                              💬 {p.registration_comments}
                            </div>
                          )}
                        </td>
                      )}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        {(prefCountMap.get(p.id) ?? 0) > 0 ? (
                          <span className="badge badge-blue">
                            {prefCountMap.get(p.id)} pref{(prefCountMap.get(p.id) ?? 0) > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.65rem', color: 'var(--gold)' }}
                            onClick={() => startEdit(p)}
                            disabled={isPending}
                            title="Edit player"
                          >
                            Edit
                          </button>
                          {confirmDelete === p.id ? (
                            <>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ borderColor: 'var(--over-border)', color: 'var(--over)', fontSize: '0.65rem' }}
                                onClick={() => handleDelete(p.id)}
                                disabled={isPending}
                              >
                                {isPending ? '...' : 'Confirm'}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: '0.65rem' }}
                                onClick={() => setConfirmDelete(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.65rem', color: 'var(--over)', borderColor: 'var(--over-border)' }}
                              onClick={() => setConfirmDelete(p.id)}
                              disabled={isPending}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsv && (
        <CsvImportDialog
          tournamentId={tournamentId}
          onClose={() => setShowCsv(false)}
        />
      )}
    </div>
  )
}
