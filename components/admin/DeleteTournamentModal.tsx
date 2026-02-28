'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTournament } from '@/lib/actions/tournament'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

interface DeleteTournamentModalProps {
  open: boolean
  onClose: () => void
  tournamentId: string
  tournamentName: string
  leagueId: string
}

export default function DeleteTournamentModal({
  open,
  onClose,
  tournamentId,
  tournamentName,
  leagueId,
}: DeleteTournamentModalProps) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const matches = confirmText.trim() === tournamentName

  const handleDelete = async () => {
    if (!matches) return
    setLoading(true)
    setError('')
    try {
      await deleteTournament(tournamentId, leagueId)
      router.push(`/dashboard/leagues/${leagueId}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete tournament')
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
      title="Delete Tournament"
      confirmLabel="Delete Tournament"
      confirmDisabled={!matches}
      confirmLoading={loading}
      onConfirm={handleDelete}
      destructive
    >
      <p style={{ marginBottom: '1rem' }}>
        This will permanently delete <strong style={{ color: 'var(--text)' }}>{tournamentName}</strong> and
        all its holes, players, groups, and scores. This action cannot be undone.
      </p>

      <Input
        id="confirm-delete-tournament"
        label="Type the tournament name to confirm"
        placeholder={tournamentName}
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
