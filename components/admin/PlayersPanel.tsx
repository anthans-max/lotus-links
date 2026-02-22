'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Tournament, Player } from '@/lib/types'
import { addPlayer, deletePlayer } from '@/lib/actions/players'
import CsvImportDialog from './CsvImportDialog'

interface PlayersPanelProps {
  tournament: Tournament | null
  players: Player[]
}

export default function PlayersPanel({ tournament, players }: PlayersPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [showCsv, setShowCsv] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState('')
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

  const handleAdd = () => {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await addPlayer(tournament.id, newName, newGrade)
        setNewName('')
        setNewGrade('')
        setShowAdd(false)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add player')
      }
    })
  }

  const handleDelete = (playerId: string) => {
    startTransition(async () => {
      try {
        await deletePlayer(playerId)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete player')
      }
    })
  }

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
          <span className="section-tag">Roster Management</span>
          <div className="gold-divider" />
          <h2 className="section-title">Players</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCsv(true)}>
            Import CSV
          </button>
          <button className="btn btn-gold btn-sm" onClick={() => setShowAdd(true)}>
            + Add Player
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

      {/* Add player form */}
      {showAdd && (
        <div className="card card-gold" style={{ marginBottom: '1.25rem', animation: 'fadeUp 0.3s ease' }}>
          <div
            style={{
              fontFamily: 'var(--fd)',
              fontSize: '1.1rem',
              color: 'var(--text)',
              marginBottom: '1rem',
            }}
          >
            Add New Player
          </div>
          <div className="g2" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="label">Full Name</div>
              <input
                className="input"
                placeholder="Student name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
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
          </div>
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

      {/* Player count */}
      <div style={{ marginBottom: '1rem' }}>
        <span className="badge badge-gold">{players.length} players</span>
      </div>

      {/* Player table */}
      {players.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            No players yet. Add players manually or import from CSV.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--forest)' }}>
                  {['Player', 'Grade', ''].map(h => (
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
                {players.map(p => (
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
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '0.65rem 0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {p.grade || '—'}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.65rem', color: 'var(--red)', borderColor: 'rgba(192,57,43,0.25)' }}
                        onClick={() => handleDelete(p.id)}
                        disabled={isPending}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsv && (
        <CsvImportDialog
          tournamentId={tournament.id}
          onClose={() => setShowCsv(false)}
        />
      )}
    </div>
  )
}
