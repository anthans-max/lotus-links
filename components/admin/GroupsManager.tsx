'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Tournament, Player, Group, GroupPlayer, PairingPreference } from '@/lib/types'
import {
  createGroup,
  updateGroup,
  deleteGroup,
  assignPlayerToGroup,
  removePlayerFromGroup,
  autoGenerateGroups,
  regenerateGroupPin,
} from '@/lib/actions/groups'

interface GroupsManagerProps {
  tournamentId: string
  leagueId: string
  tournament: Tournament
  players: Player[]
  groups: (Group & { group_players: GroupPlayer[] })[]
  pairingPrefs: PairingPreference[]
}

export default function GroupsManager({
  tournamentId,
  leagueId,
  tournament,
  players,
  groups,
  pairingPrefs,
}: GroupsManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [showPairings, setShowPairings] = useState(false)
  const [newName, setNewName] = useState(`Group ${groups.length + 1}`)
  const [newChaperone, setNewChaperone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newStarting, setNewStarting] = useState('')
  const [groupSize, setGroupSize] = useState('4')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editGroup, setEditGroup] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editChaperone, setEditChaperone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editStarting, setEditStarting] = useState('')
  const [copiedPin, setCopiedPin] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [confirmSendAll, setConfirmSendAll] = useState(false)
  const [sendingAll, setSendingAll] = useState(false)

  // Build assigned player ID set
  const assignedPlayerIds = useMemo(() => {
    const set = new Set<string>()
    groups.forEach(g => g.group_players.forEach(gp => set.add(gp.player_id)))
    return set
  }, [groups])

  const unassignedPlayers = players.filter(p => !assignedPlayerIds.has(p.id))
  const playerMap = new Map(players.map(p => [p.id, p]))

  const groupsWithEmail = groups.filter(g => g.chaperone_email)

  // Build pairing preference summary
  const pairingMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const pref of pairingPrefs) {
      if (!map.has(pref.player_id)) map.set(pref.player_id, [])
      map.get(pref.player_id)!.push(pref.preferred_player_id)
    }
    return map
  }, [pairingPrefs])

  // Find mutual preferences
  const mutualPairs = useMemo(() => {
    const pairs: [string, string][] = []
    const seen = new Set<string>()
    for (const [pid, wants] of pairingMap) {
      for (const wid of wants) {
        const key = [pid, wid].sort().join('-')
        if (seen.has(key)) continue
        seen.add(key)
        if (pairingMap.get(wid)?.includes(pid)) {
          pairs.push([pid, wid])
        }
      }
    }
    return pairs
  }, [pairingMap])

  const handleCreate = () => {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await createGroup(
          tournamentId,
          newName,
          newChaperone || undefined,
          newStarting ? parseInt(newStarting) : undefined,
          newEmail || undefined,
          newPhone || undefined
        )
        setNewName(`Group ${groups.length + 2}`)
        setNewChaperone('')
        setNewEmail('')
        setNewPhone('')
        setNewStarting('')
        setShowCreate(false)
        setSuccess('Group created')
        setTimeout(() => setSuccess(null), 2000)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create group')
      }
    })
  }

  const handleAutoGenerate = () => {
    setError(null)
    const size = parseInt(groupSize) || 4
    startTransition(async () => {
      try {
        const result = await autoGenerateGroups(tournamentId, size)
        setSuccess(`Created ${result.groupCount} groups`)
        setTimeout(() => setSuccess(null), 3000)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to auto-generate groups')
      }
    })
  }

  const handleDelete = (groupId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        await deleteGroup(groupId)
        setConfirmDelete(null)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete group')
      }
    })
  }

  const handleAssign = (groupId: string, playerId: string) => {
    startTransition(async () => {
      try {
        await assignPlayerToGroup(groupId, playerId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to assign player')
      }
    })
  }

  const handleRemove = (groupId: string, playerId: string) => {
    startTransition(async () => {
      try {
        await removePlayerFromGroup(groupId, playerId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove player')
      }
    })
  }

  const handleUpdate = (groupId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        await updateGroup(groupId, {
          name: editName || undefined,
          chaperone_name: editChaperone || null,
          chaperone_email: editEmail || null,
          chaperone_phone: editPhone || null,
          starting_hole: editStarting ? parseInt(editStarting) : null,
        })
        setEditGroup(null)
        setSuccess('Group updated')
        setTimeout(() => setSuccess(null), 2000)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update group')
      }
    })
  }

  const handleRegeneratePin = (groupId: string) => {
    startTransition(async () => {
      try {
        await regenerateGroupPin(groupId, tournamentId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to regenerate PIN')
      }
    })
  }

  const copyPin = (pin: string) => {
    navigator.clipboard.writeText(pin)
    setCopiedPin(pin)
    setTimeout(() => setCopiedPin(null), 1500)
  }

  const copyLink = (groupId: string) => {
    const url = `${window.location.origin}/score/${groupId}`
    navigator.clipboard.writeText(url)
    setCopiedLink(groupId)
    setTimeout(() => setCopiedLink(null), 1500)
  }

  const handleEmailLink = async (groupId: string, email: string) => {
    setSendingEmail(groupId)
    setError(null)
    try {
      const res = await fetch('/api/email/send-scoring-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          groupId,
          email,
          baseUrl: window.location.origin,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send email')
      setSuccess(`Email sent to ${email}`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send email')
    } finally {
      setSendingEmail(null)
    }
  }

  const handleSendAll = async () => {
    setSendingAll(true)
    setConfirmSendAll(false)
    setError(null)
    try {
      const res = await fetch('/api/email/send-scoring-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'bulk',
          tournamentId,
          baseUrl: window.location.origin,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send emails')
      setSuccess(`Sent ${data.sent} email${data.sent !== 1 ? 's' : ''}${data.failed ? `, ${data.failed} failed` : ''}`)
      setTimeout(() => setSuccess(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send emails')
    } finally {
      setSendingAll(false)
    }
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

      {/* Pairing preferences toggle */}
      {pairingPrefs.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            className={`btn ${showPairings ? 'btn-gold' : 'btn-outline'} btn-sm`}
            onClick={() => setShowPairings(!showPairings)}
          >
            {showPairings ? 'Hide' : 'View'} Pairing Preferences ({pairingPrefs.length})
          </button>

          {showPairings && (
            <div className="card card-gold" style={{ marginTop: '0.75rem', animation: 'fadeUp 0.3s ease' }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                Pairing Preferences
              </div>

              {/* Mutual preferences */}
              {mutualPairs.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div className="label" style={{ marginBottom: '0.35rem' }}>Mutual Matches</div>
                  {mutualPairs.map(([a, b]) => {
                    const pA = playerMap.get(a)
                    const pB = playerMap.get(b)
                    if (!pA || !pB) return null
                    return (
                      <div key={`${a}-${b}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                        <span className="badge badge-green" style={{ fontSize: '0.55rem' }}>MUTUAL</span>
                        <span style={{ fontSize: '0.85rem' }}>{pA.name}</span>
                        <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>↔</span>
                        <span style={{ fontSize: '0.85rem' }}>{pB.name}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* All preferences */}
              <div className="label" style={{ marginBottom: '0.35rem' }}>All Requests</div>
              {[...pairingMap.entries()].map(([pid, wantsList]) => {
                const player = playerMap.get(pid)
                if (!player) return null
                return (
                  <div key={pid} style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
                    <strong style={{ color: 'var(--text)' }}>{player.name}</strong>
                    <span style={{ color: 'var(--text-muted)' }}> wants to play with </span>
                    {wantsList.map((wid, i) => {
                      const w = playerMap.get(wid)
                      const isMutual = pairingMap.get(wid)?.includes(pid)
                      return (
                        <span key={wid}>
                          {i > 0 && ', '}
                          <span style={{ color: isMutual ? '#4CAF50' : 'var(--gold)' }}>
                            {w?.name ?? 'Unknown'}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-gold btn-sm" onClick={() => setShowCreate(true)}>
          + Create Group
        </button>
        {players.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleAutoGenerate}
              disabled={isPending}
            >
              {isPending ? 'Generating...' : 'Auto-Generate Groups'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>Size:</span>
              <select
                className="input"
                value={groupSize}
                onChange={e => setGroupSize(e.target.value)}
                style={{ width: 60, fontSize: '0.8rem', padding: '0.3rem 0.5rem', minHeight: 32 }}
              >
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
          </div>
        )}
        {groupsWithEmail.length > 0 && (
          <>
            {confirmSendAll ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Send to {groupsWithEmail.length} chaperone{groupsWithEmail.length !== 1 ? 's' : ''}?
                </span>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={handleSendAll}
                  disabled={sendingAll}
                >
                  Confirm
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmSendAll(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setConfirmSendAll(true)}
                disabled={sendingAll}
              >
                {sendingAll ? 'Sending...' : `Send All Links (${groupsWithEmail.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Create group form */}
      {showCreate && (
        <div className="card card-gold" style={{ marginBottom: '1.25rem', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '1rem' }}>
            Create New Group
          </div>
          <div className="g3" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="label">Group Name</div>
              <input
                className="input"
                placeholder="e.g. Group 1"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <div className="label">Chaperone (optional)</div>
              <input
                className="input"
                placeholder="Chaperone name"
                value={newChaperone}
                onChange={e => setNewChaperone(e.target.value)}
              />
            </div>
            <div>
              <div className="label">Chaperone Email (optional)</div>
              <input
                className="input"
                type="email"
                placeholder="chaperone@email.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="label">Chaperone Phone (optional)</div>
              <input
                className="input"
                type="tel"
                placeholder="(555) 555-5555"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
              />
            </div>
            <div>
              <div className="label">Starting Hole (optional)</div>
              <input
                className="input"
                type="number"
                min="1"
                max={tournament.holes}
                placeholder={`1-${tournament.holes}`}
                value={newStarting}
                onChange={e => setNewStarting(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-gold" onClick={handleCreate} disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Group'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Unassigned players */}
      {unassignedPlayers.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="label" style={{ marginBottom: '0.5rem' }}>
            Unassigned Players ({unassignedPlayers.length})
          </div>
          <div className="card" style={{ padding: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {unassignedPlayers.map(p => (
              <span key={p.id} className="badge badge-gray" style={{ fontSize: '0.72rem' }}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Group cards */}
      {groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderStyle: 'dashed', borderColor: 'var(--border2)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👥</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.15rem', marginBottom: '0.5rem' }}>No Groups Yet</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Create groups manually or use auto-generate to create groups based on pairing preferences.
          </div>
        </div>
      ) : (
        <div className="g2">
          {groups.map(group => {
            const groupPlayers = group.group_players
              .map(gp => playerMap.get(gp.player_id))
              .filter((p): p is Player => !!p)

            const isEditing = editGroup === group.id

            return (
              <div key={group.id} className="card" style={{ borderTop: '2px solid var(--gold-border)' }}>
                {/* Group header */}
                {isEditing ? (
                  <div style={{ marginBottom: '0.75rem', animation: 'fadeUp 0.2s ease' }}>
                    <div className="g2" style={{ marginBottom: '0.75rem' }}>
                      <div>
                        <div className="label">Name</div>
                        <input className="input" value={editName} onChange={e => setEditName(e.target.value)} style={{ fontSize: '0.85rem' }} />
                      </div>
                      <div>
                        <div className="label">Chaperone</div>
                        <input className="input" value={editChaperone} onChange={e => setEditChaperone(e.target.value)} style={{ fontSize: '0.85rem' }} />
                      </div>
                    </div>
                    <div className="g2" style={{ marginBottom: '0.75rem' }}>
                      <div>
                        <div className="label">Chaperone Email</div>
                        <input className="input" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ fontSize: '0.85rem' }} placeholder="chaperone@email.com" />
                      </div>
                      <div>
                        <div className="label">Chaperone Phone</div>
                        <input className="input" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ fontSize: '0.85rem' }} placeholder="(555) 555-5555" />
                      </div>
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div className="label">Starting Hole</div>
                      <input className="input" type="number" min="1" max={tournament.holes} value={editStarting} onChange={e => setEditStarting(e.target.value)} style={{ fontSize: '0.85rem', width: 80 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-gold btn-sm" onClick={() => handleUpdate(group.id)} disabled={isPending}>
                        Save
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditGroup(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', color: 'var(--text)' }}>
                        {group.name}
                      </div>
                      {group.chaperone_name && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', marginTop: '0.15rem' }}>
                          CHAPERONE &middot; {group.chaperone_name}
                        </div>
                      )}
                      {group.chaperone_email && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                          {group.chaperone_email}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {group.starting_hole && (
                        <span className="badge badge-gray">H{group.starting_hole}</span>
                      )}
                      <button
                        className="badge badge-gold tap"
                        style={{ cursor: 'pointer', border: '1px solid var(--gold-border)' }}
                        onClick={() => copyPin(group.pin)}
                        title="Click to copy PIN"
                      >
                        PIN: {group.pin} {copiedPin === group.pin ? '✓' : ''}
                      </button>
                      <button
                        className="btn btn-icon"
                        style={{ width: 28, height: 28, fontSize: '0.6rem' }}
                        onClick={() => {
                          setEditGroup(group.id)
                          setEditName(group.name)
                          setEditChaperone(group.chaperone_name ?? '')
                          setEditEmail(group.chaperone_email ?? '')
                          setEditPhone(group.chaperone_phone ?? '')
                          setEditStarting(String(group.starting_hole ?? ''))
                        }}
                        title="Edit group"
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                )}

                {/* Players in group */}
                {groupPlayers.length > 0 ? (
                  groupPlayers.map(p => {
                    const hasPref = pairingMap.has(p.id)
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.45rem 0',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
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
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.2 }}>
                            {p.name}
                          </div>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                            {p.grade && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                                Grade {p.grade}
                              </span>
                            )}
                            {hasPref && (
                              <span style={{ fontSize: '0.6rem', color: 'var(--blue)', fontFamily: 'var(--fm)' }}>
                                Has pairing prefs
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="btn btn-icon"
                          style={{ width: 28, height: 28, fontSize: '0.7rem' }}
                          onClick={() => handleRemove(group.id, p.id)}
                          disabled={isPending}
                          title="Remove from group"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', padding: '0.5rem 0' }}>
                    No players assigned
                  </div>
                )}

                {/* Add player dropdown */}
                {unassignedPlayers.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <select
                      className="input"
                      style={{ fontSize: '0.82rem' }}
                      value=""
                      onChange={e => {
                        if (e.target.value) handleAssign(group.id, e.target.value)
                      }}
                      disabled={isPending}
                    >
                      <option value="">+ Add player...</option>
                      {unassignedPlayers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.grade ? ` (${p.grade})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Group actions */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.65rem' }}
                    onClick={() => copyLink(group.id)}
                  >
                    {copiedLink === group.id ? 'Copied!' : 'Copy Link'}
                  </button>
                  {group.chaperone_email && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.65rem' }}
                      onClick={() => handleEmailLink(group.id, group.chaperone_email!)}
                      disabled={sendingEmail === group.id}
                    >
                      {sendingEmail === group.id ? 'Sending...' : 'Email Link'}
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.65rem' }}
                    onClick={() => handleRegeneratePin(group.id)}
                    disabled={isPending}
                  >
                    New PIN
                  </button>
                  {confirmDelete === group.id ? (
                    <>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ borderColor: 'var(--over-border)', color: 'var(--over)', fontSize: '0.65rem' }}
                        onClick={() => handleDelete(group.id)}
                        disabled={isPending}
                      >
                        Confirm Delete
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
                      onClick={() => setConfirmDelete(group.id)}
                      disabled={isPending}
                    >
                      Delete Group
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
