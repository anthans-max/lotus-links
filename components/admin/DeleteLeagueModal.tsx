'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteLeague } from '@/lib/actions/leagues'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

interface DeleteLeagueModalProps {
  open: boolean
  onClose: () => void
  leagueId: string
  leagueName: string
}

export default function DeleteLeagueModal({ open, onClose, leagueId, leagueName }: DeleteLeagueModalProps) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const matches = confirmText.trim() === leagueName

  const handleDelete = async () => {
    if (!matches) return

    setLoading(true)
    setError('')

    try {
      await deleteLeague(leagueId)
      router.push('/dashboard/leagues')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete league')
      setLoading(false)
    }
  }

  const handleClose = () => {
    setConfirmText('')
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Delete League"
      confirmLabel="Delete League"
      confirmDisabled={!matches}
      confirmLoading={loading}
      onConfirm={handleDelete}
      destructive
    >
      <p style={{ marginBottom: '1rem' }}>
        This will permanently delete <strong style={{ color: 'var(--text)' }}>{leagueName}</strong> and
        ALL tournaments, players, groups, and scores within it. This action cannot be undone.
      </p>

      <Input
        id="confirm-delete"
        label="Type the league name to confirm"
        placeholder={leagueName}
        value={confirmText}
        onChange={e => setConfirmText(e.target.value)}
        autoComplete="off"
      />

      {error && (
        <p style={{ color: 'var(--over)', fontSize: '0.8rem', fontFamily: 'var(--fm)', marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
    </Modal>
  )
}
