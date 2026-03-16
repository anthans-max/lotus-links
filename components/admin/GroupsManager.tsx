'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Tournament, Player, Group, GroupPlayer, PairingPreference, Chaperone } from '@/lib/types'
import { getBaseUrl } from '@/lib/url'
import {
  createGroup,
  updateGroup,
  deleteGroup,
  assignPlayerToGroup,
  removePlayerFromGroup,
  autoGenerateGroups,
  regenerateGroupPin,
  bulkAssignTeeTimes,
} from '@/lib/actions/groups'
import {
  assignChaperoneToGroup,
  removeChaperoneFromGroup,
  getOrCreateGroupToken,
  createChaperone,
  deleteChaperone,
  sendGroupChaperoneEmails,
} from '@/lib/actions/chaperones'

interface GroupsManagerProps {
  tournamentId: string
  leagueId: string
  tournament: Tournament
  players: Player[]
  groups: (Group & { group_players: GroupPlayer[] })[]
  pairingPrefs: PairingPreference[]
  isWish?: boolean
  chaperones?: Chaperone[]
  groupChaperoneMap?: Record<string, string>  // groupId → chaperoneId
}

export default function GroupsManager({
  tournamentId,
  leagueId,
  tournament,
  players,
  groups,
  pairingPrefs,
  isWish = false,
  chaperones = [],
  groupChaperoneMap = {},
}: GroupsManagerProps) {
  const scorerLabel = isWish ? 'Chaperone' : 'Scorer'
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
  const [confirmEmailScorer, setConfirmEmailScorer] = useState<string | null>(null)
  const [confirmEmailGroup, setConfirmEmailGroup] = useState<string | null>(null)
  const [sendingGroupPlayers, setSendingGroupPlayers] = useState<string | null>(null)
  const [confirmSendAllPlayers, setConfirmSendAllPlayers] = useState(false)
  const [sendingAllPlayers, setSendingAllPlayers] = useState(false)
  const [sendingChaperoneToken, setSendingChaperoneToken] = useState<string | null>(null)
  const [confirmEmailChaperoneToken, setConfirmEmailChaperoneToken] = useState<string | null>(null)
  const [confirmSendAllChaperones, setConfirmSendAllChaperones] = useState(false)
  const [sendingAllChaperones, setSendingAllChaperones] = useState(false)
  const [copyingToken, setCopyingToken] = useState<string | null>(null)
  const [editTeeTime, setEditTeeTime] = useState('')
  const [confirmAutoGenerate, setConfirmAutoGenerate] = useState(false)
  // Tee time assignment modal
  const [showTeeTimeModal, setShowTeeTimeModal] = useState(false)
  const [teeStartTime, setTeeStartTime] = useState('08:00')
  const [teeIntervalMin, setTeeIntervalMin] = useState('10')
  const [assigningTeeTimes, setAssigningTeeTimes] = useState(false)
  // Inline chaperone add
  const [addingChaperoneGroup, setAddingChaperoneGroup] = useState<string | null>(null)
  const [newChapName, setNewChapName] = useState('')
  const [newChapEmail, setNewChapEmail] = useState('')
  // Per-group send scoring link
  const [sendingGroupLink, setSendingGroupLink] = useState<string | null>(null)
  const [sentGroupLinks, setSentGroupLinks] = useState<Set<string>>(new Set())

  // Build assigned player ID set
  const assignedPlayerIds = useMemo(() => {
    const set = new Set<string>()
    groups.forEach(g => g.group_players.forEach(gp => set.add(gp.player_id)))
    return set
  }, [groups])

  const unassignedPlayers = players.filter(p => !assignedPlayerIds.has(p.id))
  const playerMap = new Map(players.map(p => [p.id, p]))

  // Build chaperone lookup map
  const chaperoneById = useMemo(() => new Map(chaperones.map(c => [c.id, c])), [chaperones])

  // Groups with a formally assigned chaperone that has an email
  const groupsWithChaperoneToken = useMemo(
    () =>
      groups.filter(g => {
        const cid = groupChaperoneMap[g.id]
        if (!cid) return false
        return !!chaperoneById.get(cid)?.email
      }),
    [groups, groupChaperoneMap, chaperoneById]
  )

  const groupsWithEmail = groups.filter(g => g.chaperone_email)
  const playersWithEmailCount = useMemo(() => {
    const seen = new Set<string>()
    for (const g of groups) {
      for (const gp of g.group_players) {
        const p = playerMap.get(gp.player_id)
        if (p?.player_email) seen.add(p.id)
      }
    }
    return seen.size
  }, [groups, playerMap])

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

  // Sort groups: by tee_time ascending (nulls last), then by created_at
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      if (!a.tee_time && !b.tee_time) return 0
      if (!a.tee_time) return 1
      if (!b.tee_time) return -1
      return a.tee_time.localeCompare(b.tee_time)
    })
  }, [groups])

  function formatTeeTime(t: string) {
    const [h, m] = t.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'pm' : 'am'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  function computeTeeTimeStr(startTime: string, intervalMin: number, index: number): string {
    const [h, m] = startTime.split(':').map(Number)
    const total = h * 60 + m + index * intervalMin
    const hour = Math.floor(total / 60) % 24
    const min = total % 60
    return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

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
    if (groups.length > 0 && !confirmAutoGenerate) {
      setConfirmAutoGenerate(true)
      return
    }
    setConfirmAutoGenerate(false)
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

  const handleExportCSV = () => {
    const rows: string[][] = [['Group', 'Tee Time', 'Player', 'Grade', 'Handicap']]
    for (const group of sortedGroups) {
      const gPlayers = group.group_players
        .map(gp => playerMap.get(gp.player_id))
        .filter((p): p is Player => !!p)
      if (gPlayers.length === 0) {
        rows.push([group.name, group.tee_time ? formatTeeTime(group.tee_time) : '', '', '', ''])
      } else {
        for (const p of gPlayers) {
          rows.push([
            group.name,
            group.tee_time ? formatTeeTime(group.tee_time) : '',
            p.name,
            p.grade ?? '',
            String(p.handicap_index ?? p.handicap ?? ''),
          ])
        }
      }
    }
    const csv = rows
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `groups-${tournamentId}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
          tee_time: editTeeTime || null,
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
    const isScramble = tournament.format === 'Scramble'
    const url = isScramble
      ? `${getBaseUrl()}/score/${groupId}`
      : `${getBaseUrl()}/t/${tournament.public_token}?group=${groupId}`
    navigator.clipboard.writeText(url)
    setCopiedLink(groupId)
    setTimeout(() => setCopiedLink(null), 1500)
  }

  const handleEmailLink = async (groupId: string, email: string) => {
    setSendingEmail(groupId)
    setConfirmEmailScorer(null)
    setError(null)
    try {
      const res = await fetch('/api/email/send-scoring-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single',
          groupId,
          email,
          baseUrl: getBaseUrl(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send email')
      setSuccess(`Scoring link sent to ${email}`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send email')
    } finally {
      setSendingEmail(null)
    }
  }

  const handleEmailGroupPlayers = async (groupId: string) => {
    setSendingGroupPlayers(groupId)
    setConfirmEmailGroup(null)
    setError(null)
    try {
      const res = await fetch('/api/email/send-scoring-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'group-players',
          groupId,
          baseUrl: getBaseUrl(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send emails')
      if (data.failed > 0 && data.errors?.length > 0) {
        const failedNames = data.errors.map((e: { name: string; reason: string }) => `${e.name}: ${e.reason}`).join(' | ')
        setError(`${data.sent} sent, ${data.failed} failed — ${failedNames}`)
      } else {
        setSuccess(`Scoring link sent to ${data.sent} player${data.sent !== 1 ? 's' : ''}`)
        setTimeout(() => setSuccess(null), 4000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send emails')
    } finally {
      setSendingGroupPlayers(null)
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
          baseUrl: getBaseUrl(),
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

  const handleAssignChaperone = (groupId: string, chaperoneId: string) => {
    if (!chaperoneId) return
    startTransition(async () => {
      try {
        await assignChaperoneToGroup(groupId, chaperoneId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to assign chaperone')
      }
    })
  }

  const handleRemoveChaperone = (groupId: string) => {
    startTransition(async () => {
      try {
        await removeChaperoneFromGroup(groupId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove chaperone')
      }
    })
  }

  const handleEmailChaperoneToken = async (groupId: string) => {
    setSendingChaperoneToken(groupId)
    setConfirmEmailChaperoneToken(null)
    setError(null)
    try {
      const res = await fetch('/api/email/send-scoring-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chaperone-token', groupId, baseUrl: getBaseUrl() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send email')
      setSuccess('Scoring link sent to chaperone')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send email')
    } finally {
      setSendingChaperoneToken(null)
    }
  }

  const handleSendAllChaperones = async () => {
    setSendingAllChaperones(true)
    setConfirmSendAllChaperones(false)
    setError(null)
    try {
      const res = await fetch('/api/email/send-scoring-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all-chaperones-token', tournamentId, baseUrl: getBaseUrl() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send emails')
      setSuccess(`Sent ${data.sent} chaperone email${data.sent !== 1 ? 's' : ''}${data.failed ? `, ${data.failed} failed` : ''}`)
      setTimeout(() => setSuccess(null), 4000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send emails')
    } finally {
      setSendingAllChaperones(false)
    }
  }

  const handleAssignTeeTimes = () => {
    const interval = parseInt(teeIntervalMin) || 10
    const groupTeeTimes = sortedGroups.map((g, i) => ({
      id: g.id,
      tee_time: computeTeeTimeStr(teeStartTime, interval, i),
    }))
    setAssigningTeeTimes(true)
    startTransition(async () => {
      try {
        await bulkAssignTeeTimes(groupTeeTimes)
        setShowTeeTimeModal(false)
        setSuccess(`Tee times assigned to ${groupTeeTimes.length} groups`)
        setTimeout(() => setSuccess(null), 3000)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to assign tee times')
      } finally {
        setAssigningTeeTimes(false)
      }
    })
  }

  const handleAddChaperone = (groupId: string) => {
    if (!newChapName.trim()) return
    startTransition(async () => {
      try {
        await createChaperone(tournamentId, {
          name: newChapName.trim(),
          email: newChapEmail.trim() || undefined,
          group_id: groupId,
        })
        setAddingChaperoneGroup(null)
        setNewChapName('')
        setNewChapEmail('')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add chaperone')
      }
    })
  }

  const handleRemoveInlineChaperone = (chaperoneId: string) => {
    startTransition(async () => {
      try {
        await deleteChaperone(chaperoneId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove chaperone')
      }
    })
  }

  const handleSendGroupLink = async (groupId: string) => {
    setSendingGroupLink(groupId)
    setError(null)
    try {
      const result = await sendGroupChaperoneEmails(groupId)
      setSentGroupLinks(prev => new Set([...prev, groupId]))
      setSuccess(
        `Scoring link sent to ${result.sent} chaperone${result.sent !== 1 ? 's' : ''}${result.failed ? `, ${result.failed} failed` : ''}`
      )
      setTimeout(() => setSuccess(null), 4000)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send scoring link')
    } finally {
      setSendingGroupLink(null)
    }
  }

  const handleCopyTokenLink = async (groupId: string) => {
    setCopyingToken(groupId)
    try {
      const token = await getOrCreateGroupToken(groupId, tournamentId)
      await navigator.clipboard.writeText(`${getBaseUrl()}/score/t/${token}`)
      setCopyingToken(`copied-${groupId}`)
      setTimeout(() => setCopyingToken(null), 1500)
    } catch {
      setCopyingToken(null)
      setError('Failed to generate token link')
    }
  }

  const handleSendAllPlayers = async () => {
    setSendingAllPlayers(true)
    setConfirmSendAllPlayers(false)
    setError(null)
    try {
      const res = await fetch('/api/email/send-scoring-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'all-players',
          tournamentId,
          baseUrl: getBaseUrl(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send emails')
      if (data.failed > 0 && data.errors?.length > 0) {
        const failedNames = data.errors.map((e: { name: string; reason: string }) => `${e.name}: ${e.reason}`).join(' | ')
        setError(`${data.sent} sent, ${data.failed} failed — ${failedNames}`)
      } else {
        setSuccess(`Scoring links sent to ${data.sent} player${data.sent !== 1 ? 's' : ''} across all groups`)
        setTimeout(() => setSuccess(null), 5000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send emails')
    } finally {
      setSendingAllPlayers(false)
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

      {/* Auto-generate confirm banner */}
      {confirmAutoGenerate && (
        <div className="card card-gold" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', animation: 'fadeUp 0.2s ease' }}>
          <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            This will delete all {groups.length} existing group{groups.length !== 1 ? 's' : ''} and regenerate from scratch. Continue?
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="btn btn-gold btn-sm" onClick={handleAutoGenerate} disabled={isPending}>
              {isPending ? 'Generating...' : 'Yes, Regenerate'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmAutoGenerate(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tee time assignment modal */}
      {showTeeTimeModal && (
        <div className="card card-gold" style={{ marginBottom: '1rem', animation: 'fadeUp 0.25s ease' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.75rem' }}>
            Assign Sequential Tee Times
          </div>
          <div className="g2" style={{ marginBottom: '0.75rem' }}>
            <div>
              <div className="label">Start Time</div>
              <input
                className="input"
                type="time"
                value={teeStartTime}
                onChange={e => setTeeStartTime(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <div className="label">Interval (min)</div>
              <input
                className="input"
                type="number"
                min="1"
                max="60"
                value={teeIntervalMin}
                onChange={e => setTeeIntervalMin(e.target.value)}
                style={{ fontSize: '0.85rem', width: 80 }}
              />
            </div>
          </div>
          {/* Preview */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div className="label" style={{ marginBottom: '0.35rem', fontSize: '0.65rem' }}>
              Preview ({Math.min(3, sortedGroups.length)} of {sortedGroups.length})
            </div>
            {sortedGroups.slice(0, 3).map((g, i) => {
              const computed = computeTeeTimeStr(teeStartTime, parseInt(teeIntervalMin) || 10, i)
              return (
                <div key={g.id} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.1rem 0', fontFamily: 'var(--fm)' }}>
                  {g.name} → {formatTeeTime(computed)}
                </div>
              )
            })}
            {sortedGroups.length > 3 && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                ...and {sortedGroups.length - 3} more
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="btn btn-gold btn-sm" onClick={handleAssignTeeTimes} disabled={assigningTeeTimes || isPending}>
              {assigningTeeTimes ? 'Assigning...' : `Apply to All ${sortedGroups.length} Groups`}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowTeeTimeModal(false)}>Cancel</button>
          </div>
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
              disabled={isPending || confirmAutoGenerate}
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
        {groups.length > 0 && (
          <button
            className={`btn btn-outline btn-sm${showTeeTimeModal ? ' btn-gold' : ''}`}
            onClick={() => setShowTeeTimeModal(v => !v)}
          >
            Assign Tee Times
          </button>
        )}
        {groupsWithEmail.length > 0 && (
          <>
            {confirmSendAll ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Send to {groupsWithEmail.length} {scorerLabel.toLowerCase()}{groupsWithEmail.length !== 1 ? 's' : ''}?
                </span>
                <button className="btn btn-gold btn-sm" onClick={handleSendAll} disabled={sendingAll}>Confirm</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmSendAll(false)}>Cancel</button>
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
        {groupsWithChaperoneToken.length > 0 && (
          <>
            {confirmSendAllChaperones ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Email {groupsWithChaperoneToken.length} chaperone{groupsWithChaperoneToken.length !== 1 ? 's' : ''}?
                </span>
                <button className="btn btn-gold btn-sm" onClick={handleSendAllChaperones} disabled={sendingAllChaperones}>Confirm</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmSendAllChaperones(false)}>Cancel</button>
              </div>
            ) : (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setConfirmSendAllChaperones(true)}
                disabled={sendingAllChaperones}
              >
                {sendingAllChaperones ? 'Sending...' : `Email All Chaperones (${groupsWithChaperoneToken.length})`}
              </button>
            )}
          </>
        )}
        {playersWithEmailCount > 0 && (
          <>
            {confirmSendAllPlayers ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Email all {playersWithEmailCount} players?
                </span>
                <button className="btn btn-gold btn-sm" onClick={handleSendAllPlayers} disabled={sendingAllPlayers}>Confirm</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmSendAllPlayers(false)}>Cancel</button>
              </div>
            ) : (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setConfirmSendAllPlayers(true)}
                disabled={sendingAllPlayers}
              >
                {sendingAllPlayers ? 'Sending...' : `Email All Players (${playersWithEmailCount})`}
              </button>
            )}
          </>
        )}
        {/* Divider before utility buttons */}
        {groups.length > 0 && (
          <>
            <div style={{ width: 1, height: 24, background: 'var(--border2)', margin: '0 0.25rem' }} />
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.72rem' }}
              onClick={() => {
                const win = window.open('', '_blank')
                if (!win) return
                const groupsHtml = sortedGroups.map(group => {
                  const gPlayers = group.group_players
                    .map(gp => playerMap.get(gp.player_id))
                    .filter((p): p is Player => !!p)
                  const playersHtml = gPlayers.length > 0
                    ? gPlayers.map(p => {
                        const hcp = p.handicap_index != null ? p.handicap_index : p.handicap
                        return `<li>${p.name}${hcp != null ? ` <span class="hcp">(${hcp})</span>` : ''}</li>`
                      }).join('')
                    : '<li class="empty">No players assigned</li>'
                  const teeTimeLine = group.tee_time
                    ? `<span class="tee-time">${formatTeeTime(group.tee_time)}</span>`
                    : ''
                  const holeLine = group.starting_hole
                    ? `<div class="meta">Hole ${group.starting_hole}</div>`
                    : ''
                  return `
                    <div class="group">
                      <div class="group-header">
                        <span class="group-name">${group.name}</span>
                        ${teeTimeLine}
                      </div>
                      ${holeLine}
                      <ul>${playersHtml}</ul>
                    </div>`
                }).join('')
                win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${tournament.name} — Group Pairings</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; color: #000; background: #fff; padding: 1.5rem; }
    h1 { font-size: 1.4rem; margin-bottom: 0.2rem; }
    .subtitle { font-size: 0.82rem; color: #555; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
    .group { border: 1px solid #bbb; border-radius: 4px; padding: 0.6rem 0.75rem; break-inside: avoid; }
    .group-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #ddd; padding-bottom: 0.3rem; margin-bottom: 0.3rem; }
    .group-name { font-weight: bold; font-size: 0.95rem; }
    .tee-time { font-size: 0.78rem; color: #555; }
    .meta { font-size: 0.7rem; color: #777; margin-bottom: 0.2rem; }
    ul { list-style: none; }
    li { font-size: 0.82rem; padding: 0.12rem 0; border-bottom: 1px solid #eee; }
    li:last-child { border-bottom: none; }
    .hcp { color: #666; font-size: 0.75rem; }
    .empty { color: #aaa; font-style: italic; }
    @media print {
      body { padding: 0.5rem; }
      @page { margin: 1cm; }
    }
    @media (max-width: 600px) {
      .grid { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <h1>${tournament.name} — Group Pairings</h1>
  <div class="subtitle">${sortedGroups.length} group${sortedGroups.length !== 1 ? 's' : ''} &middot; ${players.length} player${players.length !== 1 ? 's' : ''}</div>
  <div class="grid">${groupsHtml}</div>
</body>
</html>`)
                win.document.close()
                setTimeout(() => win.print(), 300)
              }}
            >
              Print Sheet
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.72rem' }}
              onClick={handleExportCSV}
            >
              Export CSV
            </button>
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
              <div className="label">{scorerLabel} (optional)</div>
              <input
                className="input"
                placeholder={`${scorerLabel} name`}
                value={newChaperone}
                onChange={e => setNewChaperone(e.target.value)}
              />
            </div>
            <div>
              <div className="label">{scorerLabel} Email (optional)</div>
              <input
                className="input"
                type="email"
                placeholder={`${scorerLabel.toLowerCase()}@email.com`}
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="label">{scorerLabel} Phone (optional)</div>
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
              <span key={p.id} className={`badge ${(p as any).willing_to_chaperone ? 'badge-gold' : 'badge-gray'}`} style={{ fontSize: '0.72rem' }}>
                {(p as any).willing_to_chaperone && '🙋 '}{p.name}
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
          {sortedGroups.map(group => {
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
                        <div className="label">{scorerLabel}</div>
                        <input className="input" value={editChaperone} onChange={e => setEditChaperone(e.target.value)} style={{ fontSize: '0.85rem' }} />
                      </div>
                    </div>
                    <div className="g2" style={{ marginBottom: '0.75rem' }}>
                      <div>
                        <div className="label">{scorerLabel} Email</div>
                        <input className="input" type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ fontSize: '0.85rem' }} placeholder={`${scorerLabel.toLowerCase()}@email.com`} />
                      </div>
                      <div>
                        <div className="label">{scorerLabel} Phone</div>
                        <input className="input" type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ fontSize: '0.85rem' }} placeholder="(555) 555-5555" />
                      </div>
                    </div>
                    <div className="g2" style={{ marginBottom: '0.75rem' }}>
                      <div>
                        <div className="label">Starting Hole</div>
                        <input className="input" type="number" min="1" max={tournament.holes} value={editStarting} onChange={e => setEditStarting(e.target.value)} style={{ fontSize: '0.85rem', width: 80 }} />
                      </div>
                      <div>
                        <div className="label">Tee Time</div>
                        <input className="input" type="time" value={editTeeTime} onChange={e => setEditTeeTime(e.target.value)} style={{ fontSize: '0.85rem', width: 130 }} />
                      </div>
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
                          {scorerLabel.toUpperCase()} &middot; {group.chaperone_name}
                        </div>
                      )}
                      {group.chaperone_email && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                          {group.chaperone_email}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {group.tee_time && (
                        <span className="badge badge-gold" style={{ fontFamily: 'var(--fm)', fontSize: '0.68rem' }}>
                          {formatTeeTime(group.tee_time)}
                        </span>
                      )}
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
                          setEditTeeTime(group.tee_time ?? '')
                        }}
                        title="Edit group"
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                )}

                {/* Chaperone assignment */}
                {chaperones.length > 0 && (() => {
                  const assignedCid = groupChaperoneMap[group.id]
                  const assignedChaperone = assignedCid ? chaperoneById.get(assignedCid) : null
                  const unassignedChaperones = chaperones.filter(c => {
                    // Allow reassigning the currently assigned chaperone
                    if (c.id === assignedCid) return false
                    // Show chaperones not assigned to any other group
                    const alreadyUsed = Object.entries(groupChaperoneMap).some(
                      ([gid, cid]) => gid !== group.id && cid === c.id
                    )
                    return !alreadyUsed
                  })
                  return (
                    <div
                      style={{
                        padding: '0.6rem 0.75rem',
                        marginBottom: '0.5rem',
                        background: 'var(--surface2)',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.62rem',
                          color: 'var(--text-dim)',
                          fontFamily: 'var(--fm)',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          marginBottom: '0.4rem',
                        }}
                      >
                        Chaperone
                      </div>
                      {assignedChaperone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{assignedChaperone.name}</span>
                            <span
                              className={`badge badge-${assignedChaperone.role === 'parent' ? 'blue' : assignedChaperone.role === 'coach' ? 'gold' : 'green'}`}
                              style={{ fontSize: '0.55rem', marginLeft: '0.35rem', textTransform: 'capitalize' }}
                            >
                              {assignedChaperone.role}
                            </span>
                            {assignedChaperone.email && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                                {assignedChaperone.email}
                              </div>
                            )}
                          </div>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.6rem', color: 'var(--over)', borderColor: 'var(--over-border)' }}
                            onClick={() => handleRemoveChaperone(group.id)}
                            disabled={isPending}
                            title="Remove chaperone assignment"
                          >
                            Unassign
                          </button>
                        </div>
                      ) : (
                        <select
                          className="input"
                          style={{ fontSize: '0.82rem', padding: '0.3rem 0.5rem', minHeight: 32 }}
                          value=""
                          onChange={e => {
                            if (e.target.value) handleAssignChaperone(group.id, e.target.value)
                          }}
                          disabled={isPending}
                        >
                          <option value="">Assign chaperone...</option>
                          {chaperones.map(c => {
                            const takenByOther = Object.entries(groupChaperoneMap).some(
                              ([gid, cid]) => gid !== group.id && cid === c.id
                            )
                            return (
                              <option key={c.id} value={c.id} disabled={takenByOther}>
                                {c.name} ({c.role}){takenByOther ? ' — assigned' : ''}
                              </option>
                            )
                          })}
                        </select>
                      )}
                    </div>
                  )
                })()}

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
                            {(p as any).willing_to_chaperone && (
                              <span style={{ fontSize: '0.6rem', color: 'var(--gold)', fontFamily: 'var(--fm)' }}>
                                🙋 {scorerLabel} volunteer
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
                          {(p as any).willing_to_chaperone ? '🙋 ' : ''}{p.name}{p.grade ? ` (${p.grade})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Inline chaperones section */}
                {(() => {
                  const inlineChaps = chaperones.filter(c => c.group_id === group.id)
                  const isAdding = addingChaperoneGroup === group.id
                  return (
                    <div style={{ paddingTop: '0.6rem', marginTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Chaperones{inlineChaps.length > 0 ? ` (${inlineChaps.length})` : ''}
                      </div>
                      {inlineChaps.map(chap => (
                        <div
                          key={chap.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.28rem 0', borderBottom: '1px solid var(--border)' }}
                        >
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flex: 1, lineHeight: 1.3 }}>
                            {chap.name}
                            {chap.email && (
                              <span style={{ color: 'var(--text-dim)', marginLeft: '0.4rem', fontSize: '0.65rem' }}>
                                {chap.email}
                              </span>
                            )}
                            {chap.token_sent_at && (
                              <span style={{ color: 'var(--gold)', marginLeft: '0.35rem', fontSize: '0.62rem', fontFamily: 'var(--fm)' }}>✓ sent</span>
                            )}
                          </span>
                          <button
                            className="btn btn-icon"
                            style={{ width: 22, height: 22, fontSize: '0.58rem', flexShrink: 0 }}
                            onClick={() => handleRemoveInlineChaperone(chap.id)}
                            disabled={isPending}
                            title="Remove chaperone"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {isAdding ? (
                        <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <input
                            className="input"
                            placeholder="Name *"
                            value={newChapName}
                            onChange={e => setNewChapName(e.target.value)}
                            style={{ fontSize: '0.82rem' }}
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleAddChaperone(group.id)}
                          />
                          <input
                            className="input"
                            type="email"
                            placeholder="Email (optional)"
                            value={newChapEmail}
                            onChange={e => setNewChapEmail(e.target.value)}
                            style={{ fontSize: '0.82rem' }}
                          />
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              className="btn btn-gold btn-sm"
                              onClick={() => handleAddChaperone(group.id)}
                              disabled={isPending || !newChapName.trim()}
                            >
                              Add
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => { setAddingChaperoneGroup(null); setNewChapName(''); setNewChapEmail('') }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.62rem', marginTop: '0.35rem' }}
                          onClick={() => { setAddingChaperoneGroup(group.id); setNewChapName(''); setNewChapEmail('') }}
                        >
                          + Add Chaperone
                        </button>
                      )}
                    </div>
                  )
                })()}

                {/* Group actions */}
                {(() => {
                  const playersWithEmail = groupPlayers.filter(p => p.player_email)
                  const assignedCid = groupChaperoneMap[group.id]
                  const assignedChaperone = assignedCid ? chaperoneById.get(assignedCid) : null
                  const inlineChapsForGroup = chaperones.filter(c => c.group_id === group.id)
                  const anyChapEmail = inlineChapsForGroup.some(c => c.email) || !!assignedChaperone?.email
                  const hasSentLink = sentGroupLinks.has(group.id) || inlineChapsForGroup.some(c => c.token_sent_at)
                  return (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {/* Send Scoring Link — appears when any chaperone has email */}
                      {anyChapEmail && (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.25rem' }}>
                          {!group.tee_time && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--over)' }}>
                              No tee time set — email will not include a tee time
                            </div>
                          )}
                          <div>
                            <button
                              className={`btn btn-sm ${hasSentLink ? 'btn-outline' : 'btn-gold'}`}
                              style={{ fontSize: '0.7rem' }}
                              onClick={() => handleSendGroupLink(group.id)}
                              disabled={sendingGroupLink === group.id}
                            >
                              {sendingGroupLink === group.id
                                ? 'Sending...'
                                : hasSentLink
                                ? '✓ Resend Link'
                                : 'Send Scoring Link'}
                            </button>
                          </div>
                        </div>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.65rem' }}
                        onClick={() => copyLink(group.id)}
                      >
                        {copiedLink === group.id ? 'Copied!' : 'Copy Link'}
                      </button>

                      {/* Copy Token Link — if chaperones feature is in use */}
                      {chaperones.length > 0 && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.65rem' }}
                          onClick={() => handleCopyTokenLink(group.id)}
                          disabled={copyingToken === group.id}
                        >
                          {copyingToken === `copied-${group.id}` ? 'Copied!' : copyingToken === group.id ? '...' : 'Copy Token Link'}
                        </button>
                      )}

                      {/* Email Chaperone (token-based) — formal assignment */}
                      {assignedChaperone?.email && (
                        confirmEmailChaperoneToken === group.id ? (
                          <>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                              Send token link to {assignedChaperone.name}?
                            </span>
                            <button
                              className="btn btn-gold btn-sm"
                              style={{ fontSize: '0.65rem' }}
                              onClick={() => handleEmailChaperoneToken(group.id)}
                              disabled={sendingChaperoneToken === group.id}
                            >
                              {sendingChaperoneToken === group.id ? 'Sending...' : 'Confirm'}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.65rem' }}
                              onClick={() => setConfirmEmailChaperoneToken(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => {
                              setConfirmEmailChaperoneToken(group.id)
                              setConfirmEmailScorer(null)
                              setConfirmEmailGroup(null)
                              setConfirmDelete(null)
                            }}
                            disabled={sendingChaperoneToken === group.id}
                          >
                            Email Chaperone
                          </button>
                        )
                      )}

                      {/* Email Scorer — with inline confirm */}
                      {group.chaperone_email && (
                        confirmEmailScorer === group.id ? (
                          <>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                              Send to {group.chaperone_email}?
                            </span>
                            <button
                              className="btn btn-gold btn-sm"
                              style={{ fontSize: '0.65rem' }}
                              onClick={() => handleEmailLink(group.id, group.chaperone_email!)}
                              disabled={sendingEmail === group.id}
                            >
                              {sendingEmail === group.id ? 'Sending...' : 'Confirm'}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.65rem' }}
                              onClick={() => setConfirmEmailScorer(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => { setConfirmEmailScorer(group.id); setConfirmEmailGroup(null); setConfirmDelete(null) }}
                            disabled={sendingEmail === group.id}
                          >
                            Email {scorerLabel}
                          </button>
                        )
                      )}

                      {/* Email Group (players) — with inline confirm */}
                      {playersWithEmail.length > 0 && (
                        confirmEmailGroup === group.id ? (
                          <>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                              Send to {playersWithEmail.length} of {groupPlayers.length} player{groupPlayers.length !== 1 ? 's' : ''}?
                            </span>
                            <button
                              className="btn btn-gold btn-sm"
                              style={{ fontSize: '0.65rem' }}
                              onClick={() => handleEmailGroupPlayers(group.id)}
                              disabled={sendingGroupPlayers === group.id}
                            >
                              {sendingGroupPlayers === group.id ? 'Sending...' : 'Confirm'}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.65rem' }}
                              onClick={() => setConfirmEmailGroup(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => { setConfirmEmailGroup(group.id); setConfirmEmailScorer(null); setConfirmDelete(null) }}
                            disabled={sendingGroupPlayers === group.id}
                          >
                            Email Group ({playersWithEmail.length})
                          </button>
                        )
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
                          onClick={() => { setConfirmDelete(group.id); setConfirmEmailScorer(null); setConfirmEmailGroup(null) }}
                          disabled={isPending}
                        >
                          Delete Group
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
