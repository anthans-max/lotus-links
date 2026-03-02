'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateLeague, getLeagueAdmins, inviteLeagueAdmin, removeLeagueAdmin } from '@/lib/actions/leagues'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import LogoUpload from '@/components/admin/LogoUpload'
import type { League, LeagueAdmin } from '@/lib/types'

const COLOR_OPTIONS = [
  { value: '#B91C1C', label: 'Crimson' },
  { value: '#1a5c2a', label: 'Green' },
  { value: '#2980b9', label: 'Blue' },
  { value: '#7b3fa0', label: 'Purple' },
  { value: '#d4730c', label: 'Orange' },
  { value: '#1a8a7a', label: 'Teal' },
  { value: '#b8960c', label: 'Gold' },
  { value: '#2c2c2c', label: 'Black' },
]

interface EditLeagueModalProps {
  open: boolean
  onClose: () => void
  league: League
  currentUserEmail: string
  isOwner: boolean
}

export default function EditLeagueModal({ open, onClose, league, currentUserEmail, isOwner }: EditLeagueModalProps) {
  const router = useRouter()
  const [name, setName] = useState(league.name)
  const [primaryColor, setPrimaryColor] = useState(league.primary_color)
  const [logoUrl, setLogoUrl] = useState(league.logo_url || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Admins state
  const [admins, setAdmins] = useState<LeagueAdmin[]>([])
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setAdminsLoading(true)
    setInviteEmail('')
    setInviteError('')
    setInviteSuccess('')
    getLeagueAdmins(league.id)
      .then(setAdmins)
      .catch(() => {})
      .finally(() => setAdminsLoading(false))
  }, [open, league.id])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('League name is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      await updateLeague(league.id, {
        name: name.trim(),
        primary_color: primaryColor,
        logo_url: logoUrl || null,
      })
      router.refresh()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update league')
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setInviteError('Enter a valid email address')
      return
    }
    setInviteLoading(true)
    setInviteError('')
    setInviteSuccess('')
    try {
      await inviteLeagueAdmin(league.id, email, currentUserEmail)
      setInviteEmail('')
      setInviteSuccess(`Invite sent to ${email}`)
      const updated = await getLeagueAdmins(league.id)
      setAdmins(updated)
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRemove = async (adminId: string) => {
    setRemovingId(adminId)
    try {
      await removeLeagueAdmin(league.id, adminId)
      setAdmins(prev => prev.filter(a => a.id !== adminId))
    } catch (err: any) {
      setInviteError(err.message || 'Failed to remove admin')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit League"
      confirmLabel="Save Changes"
      confirmLoading={loading}
      onConfirm={handleSave}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Input
          id="edit-name"
          label="League Name"
          placeholder="e.g. WISH Golf League"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        {/* Admins section */}
        <div>
          <label className="label" style={{ display: 'block', marginBottom: '0.6rem' }}>Admins</label>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border2)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            {adminsLoading ? (
              <div style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                Loading…
              </div>
            ) : (
              <>
                {admins.filter(admin => admin.role !== 'owner').map(admin => (
                  <div
                    key={admin.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0.875rem',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text)', fontFamily: 'var(--fm)', wordBreak: 'break-all' }}>
                        {admin.email}
                      </span>
                      {!admin.accepted_at && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                          (pending)
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--fm)',
                        padding: '2px 7px',
                        borderRadius: 10,
                        border: admin.role === 'owner'
                          ? '1px solid var(--gold-border)'
                          : '1px solid var(--border2)',
                        color: admin.role === 'owner' ? 'var(--gold)' : 'var(--text-dim)',
                        flexShrink: 0,
                      }}
                    >
                      {admin.role}
                    </span>
                    {isOwner && admin.role !== 'owner' && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.68rem', padding: '3px 8px', flexShrink: 0 }}
                        onClick={() => handleRemove(admin.id)}
                        disabled={removingId === admin.id}
                      >
                        {removingId === admin.id ? '…' : 'Remove'}
                      </button>
                    )}
                  </div>
                ))}

                {/* Invite row */}
                {isOwner && (
                  <div style={{ padding: '0.6rem 0.875rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        className="input"
                        type="email"
                        placeholder="email@example.com"
                        value={inviteEmail}
                        onChange={e => { setInviteEmail(e.target.value); setInviteError(''); setInviteSuccess('') }}
                        onKeyDown={e => e.key === 'Enter' && handleInvite()}
                        style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
                        disabled={inviteLoading}
                      />
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={handleInvite}
                        disabled={inviteLoading}
                        style={{ flexShrink: 0, fontSize: '0.75rem' }}
                      >
                        {inviteLoading ? '…' : '+ Invite'}
                      </button>
                    </div>
                    {inviteError && (
                      <p style={{ color: 'var(--over)', fontSize: '0.75rem', marginTop: '0.35rem', fontFamily: 'var(--fm)' }}>
                        {inviteError}
                      </p>
                    )}
                    {inviteSuccess && (
                      <p style={{ color: 'var(--gold)', fontSize: '0.75rem', marginTop: '0.35rem', fontFamily: 'var(--fm)' }}>
                        {inviteSuccess}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Primary Color */}
        <div>
          <label className="label" style={{ display: 'block' }}>Primary Color</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {COLOR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPrimaryColor(opt.value)}
                title={opt.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: opt.value,
                  border: primaryColor === opt.value
                    ? '3px solid var(--gold)'
                    : '2px solid var(--border2)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  outline: 'none',
                }}
              />
            ))}
          </div>
        </div>

        <LogoUpload
          leagueId={league.id}
          currentLogoUrl={logoUrl}
          onUploaded={setLogoUrl}
          onRemoved={() => setLogoUrl('')}
        />

        {error && (
          <p style={{ color: 'var(--over)', fontSize: '0.8rem', fontFamily: 'var(--fm)' }}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
