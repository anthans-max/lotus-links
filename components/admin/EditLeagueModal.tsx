'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateLeague } from '@/lib/actions/leagues'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import LogoUpload from '@/components/admin/LogoUpload'
import type { League } from '@/lib/types'

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
}

export default function EditLeagueModal({ open, onClose, league }: EditLeagueModalProps) {
  const router = useRouter()
  const [name, setName] = useState(league.name)
  const [adminEmail, setAdminEmail] = useState(league.admin_email)
  const [primaryColor, setPrimaryColor] = useState(league.primary_color)
  const [logoUrl, setLogoUrl] = useState(league.logo_url || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        admin_email: adminEmail,
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit League"
      confirmLabel="Save Changes"
      confirmLoading={loading}
      onConfirm={handleSave}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          id="edit-name"
          label="League Name"
          placeholder="e.g. WISH Golf League"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <Input
          id="edit-email"
          label="Admin Email"
          type="email"
          value={adminEmail}
          onChange={e => setAdminEmail(e.target.value)}
        />

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
