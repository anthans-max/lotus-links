'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Tournament, Player, Group, GroupPlayer } from '@/lib/types'
import {
  createGroup,
  deleteGroup,
  assignPlayerToGroup,
  removePlayerFromGroup,
  autoAssignPlayers,
} from '@/lib/actions/groups'

interface GroupsPanelProps {
  tournament: Tournament | null
  players: Player[]
  groups: (Group & { group_players: GroupPlayer[] })[]
}

export default function GroupsPanel({ tournament, players, groups }: GroupsPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newChaperone, setNewChaperone] = useState('')
  const [newStarting, setNewStarting] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!tournament) {
    return (
      <div className="section">
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⛳</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            No Tournament Yet
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Create a tournament first in the Tournament Setup tab.
          </div>
        </div>
      </div>
    )
  }

  // Build assigned player ID set
  const assignedPlayerIds = new Set<string>()
  groups.forEach(g => g.group_players.forEach(gp => assignedPlayerIds.add(gp.player_id)))
  const unassignedPlayers = players.filter(p => !assignedPlayerIds.has(p.id))

  const handleCreate = () => {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await createGroup(
          tournament.id,
          newName,
          newChaperone || undefined,
          newStarting ? parseInt(newStarting) : undefined
        )
        setNewName('')
        setNewChaperone('')
        setNewStarting('')
        setShowCreate(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create group')
      }
    })
  }

  const handleDelete = (groupId: string) => {
    startTransition(async () => {
      try {
        await deleteGroup(groupId)
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

  const handleAutoAssign = () => {
    startTransition(async () => {
      try {
        await autoAssignPlayers(tournament.id)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to auto-assign players')
      }
    })
  }

  // Resolve player names for group_players
  const playerMap = new Map(players.map(p => [p.id, p]))

  return (
    <div className="section">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <span className="section-tag">Group Management</span>
          <div className="gold-divider" />
          <h2 className="section-title">Groups</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {groups.length > 0 && unassignedPlayers.length > 0 && (
            <button
              className="btn btn-outline btn-sm"
              onClick={handleAutoAssign}
              disabled={isPending}
            >
              Auto-Assign ({unassignedPlayers.length})
            </button>
          )}
          <button className="btn btn-gold btn-sm" onClick={() => setShowCreate(true)}>
            + Create Group
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: 'rgba(192,57,43,0.12)',
            border: '1px solid rgba(192,57,43,0.3)',
            borderRadius: 2,
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.82rem',
            color: '#e74c3c',
          }}
        >
          {error}
        </div>
      )}

      {/* Create group form */}
      {showCreate && (
        <div className="card card-gold" style={{ marginBottom: '1.25rem', animation: 'fadeUp 0.3s ease' }}>
          <div
            style={{
              fontFamily: 'var(--fd)',
              fontSize: '1.1rem',
              color: 'var(--text)',
              marginBottom: '1rem',
            }}
          >
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
              />
            </div>
            <div>
              <div className="label">Chaperone Name (optional)</div>
              <input
                className="input"
                placeholder="Chaperone's name"
                value={newChaperone}
                onChange={e => setNewChaperone(e.target.value)}
              />
            </div>
            <div>
              <div className="label">Starting Hole (optional)</div>
              <input
                className="input"
                type="number"
                min="1"
                max="10"
                placeholder="1-10"
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

      {/* Unassigned count */}
      {unassignedPlayers.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <span className="badge badge-gray">
            {unassignedPlayers.length} unassigned player{unassignedPlayers.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Group cards */}
      {groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            No groups yet. Create groups and assign players to them.
          </div>
        </div>
      ) : (
        <div className="g2">
          {groups.map(group => {
            const groupPlayers = group.group_players
              .map(gp => playerMap.get(gp.player_id))
              .filter((p): p is Player => !!p)

            return (
              <div
                key={group.id}
                className="card"
                style={{ borderTop: '2px solid var(--gold-border)' }}
              >
                {/* Group header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.875rem',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', color: 'var(--text)' }}>
                      {group.name}
                    </div>
                    {group.chaperone_name && (
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-dim)',
                          fontFamily: 'var(--fm)',
                          marginTop: '0.15rem',
                        }}
                      >
                        CHAPERONE &middot; {group.chaperone_name}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span className="badge badge-gold">PIN: {group.pin}</span>
                    {group.starting_hole && (
                      <span className="badge badge-gray">H{group.starting_hole}</span>
                    )}
                  </div>
                </div>

                {/* Players in this group */}
                {groupPlayers.length > 0 ? (
                  groupPlayers.map(p => (
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
                          fontSize: '0.7rem',
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
                        {p.grade && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                            Grade {p.grade}
                          </div>
                        )}
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
                  ))
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

                {/* Delete group */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.65rem', color: 'var(--red)', borderColor: 'rgba(192,57,43,0.25)' }}
                    onClick={() => handleDelete(group.id)}
                    disabled={isPending}
                  >
                    Delete Group
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
