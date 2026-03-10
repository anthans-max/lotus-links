'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Chaperone } from '@/lib/types'
import {
  createChaperone,
  updateChaperone,
  deleteChaperone,
} from '@/lib/actions/chaperones'

const ROLES: { value: Chaperone['role']; label: string }[] = [
  { value: 'parent', label: 'Parent' },
  { value: 'coach', label: 'Coach' },
  { value: 'volunteer', label: 'Volunteer' },
]

const ROLE_BADGE: Record<Chaperone['role'], string> = {
  parent: 'badge-blue',
  coach: 'badge-gold',
  volunteer: 'badge-green',
}

interface ChaperonesManagerProps {
  tournamentId: string
  chaperones: Chaperone[]
}

export default function ChaperonesManager({ tournamentId, chaperones }: ChaperonesManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Add form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newRole, setNewRole] = useState<Chaperone['role']>('parent')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState<Chaperone['role']>('parent')

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 2500)
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await createChaperone(tournamentId, {
          name: newName,
          email: newEmail || undefined,
          phone: newPhone || undefined,
          role: newRole,
        })
        setNewName('')
        setNewEmail('')
        setNewPhone('')
        setNewRole('parent')
        setShowAdd(false)
        flash('Chaperone added')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add chaperone')
      }
    })
  }

  const startEdit = (c: Chaperone) => {
    setEditId(c.id)
    setEditName(c.name)
    setEditEmail(c.email ?? '')
    setEditPhone(c.phone ?? '')
    setEditRole(c.role)
    setConfirmDelete(null)
  }

  const handleUpdate = () => {
    if (!editId) return
    setError(null)
    startTransition(async () => {
      try {
        await updateChaperone(editId, {
          name: editName,
          email: editEmail || null,
          phone: editPhone || null,
          role: editRole,
        })
        setEditId(null)
        flash('Chaperone updated')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update chaperone')
      }
    })
  }

  const handleDelete = (id: string) => {
    setError(null)
    startTransition(async () => {
      try {
        await deleteChaperone(id)
        setConfirmDelete(null)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete chaperone')
      }
    })
  }

  return (
    <div style={{ marginTop: '2.5rem' }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <span className="section-tag">Chaperone Roster</span>
          <div className="gold-divider" />
          <h2 className="section-title" style={{ marginBottom: 0 }}>Chaperones</h2>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Parents, coaches, and volunteers who score on tournament day
          </div>
        </div>
        <button className="btn btn-gold btn-sm" onClick={() => setShowAdd(true)}>
          + Add Chaperone
        </button>
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

      {/* Add chaperone form */}
      {showAdd && (
        <div className="card card-gold" style={{ marginBottom: '1.25rem', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '1rem' }}>
            Add Chaperone
          </div>
          <div className="g2" style={{ marginBottom: '0.75rem' }}>
            <div>
              <div className="label">Full Name</div>
              <input
                className="input"
                placeholder="Chaperone name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
            </div>
            <div>
              <div className="label">Role</div>
              <select
                className="input"
                value={newRole}
                onChange={e => setNewRole(e.target.value as Chaperone['role'])}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="g2" style={{ marginBottom: '1rem' }}>
            <div>
              <div className="label">Email <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(for scoring link)</span></div>
              <input
                className="input"
                type="email"
                placeholder="chaperone@example.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="label">Phone <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span></div>
              <input
                className="input"
                type="tel"
                placeholder="(555) 555-5555"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-gold" onClick={handleAdd} disabled={isPending}>
              {isPending ? 'Adding...' : 'Add Chaperone'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chaperone list */}
      {chaperones.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '2rem 1.5rem',
            borderStyle: 'dashed',
            borderColor: 'var(--border2)',
          }}
        >
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🙋</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.35rem' }}>
            No Chaperones Yet
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Add parents, coaches, or volunteers who will score on tournament day.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--forest)' }}>
                  {['Chaperone', 'Role', 'Email', 'Phone', ''].map(h => (
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
                {chaperones.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {editId === c.id ? (
                      <td colSpan={5} style={{ padding: '0.75rem' }}>
                        <div className="g2" style={{ marginBottom: '0.5rem' }}>
                          <div>
                            <div className="label">Name</div>
                            <input
                              className="input"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              style={{ fontSize: '0.85rem' }}
                              autoFocus
                            />
                          </div>
                          <div>
                            <div className="label">Role</div>
                            <select
                              className="input"
                              value={editRole}
                              onChange={e => setEditRole(e.target.value as Chaperone['role'])}
                              style={{ fontSize: '0.85rem' }}
                            >
                              {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="g2" style={{ marginBottom: '0.75rem' }}>
                          <div>
                            <div className="label">Email</div>
                            <input
                              className="input"
                              type="email"
                              value={editEmail}
                              onChange={e => setEditEmail(e.target.value)}
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                          <div>
                            <div className="label">Phone</div>
                            <input
                              className="input"
                              type="tel"
                              value={editPhone}
                              onChange={e => setEditPhone(e.target.value)}
                              style={{ fontSize: '0.85rem' }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn btn-gold btn-sm" onClick={handleUpdate} disabled={isPending}>
                            Save
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>
                            Cancel
                          </button>
                        </div>
                      </td>
                    ) : (
                      <>
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
                              {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{c.name}</div>
                          </div>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span className={`badge ${ROLE_BADGE[c.role]}`} style={{ fontSize: '0.6rem', textTransform: 'capitalize' }}>
                            {c.role}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                          {c.email || '—'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                          {c.phone || '—'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.65rem', color: 'var(--gold)' }}
                              onClick={() => startEdit(c)}
                              disabled={isPending}
                            >
                              Edit
                            </button>
                            {confirmDelete === c.id ? (
                              <>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ borderColor: 'var(--over-border)', color: 'var(--over)', fontSize: '0.65rem' }}
                                  onClick={() => handleDelete(c.id)}
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
                                onClick={() => { setConfirmDelete(c.id); setEditId(null) }}
                                disabled={isPending}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
