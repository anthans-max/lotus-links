'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteTournament } from '@/lib/actions/tournament'
import type { Tournament } from '@/lib/types'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

interface LeagueTournamentsProps {
  tournaments: Tournament[]
  leagueId: string
  leagueColor?: string
}

export default function LeagueTournaments({ tournaments, leagueId, leagueColor }: LeagueTournamentsProps) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget || confirmName !== deleteTarget.name) return
    setDeleting(true)
    try {
      await deleteTournament(deleteTarget.id, leagueId)
      setDeleteTarget(null)
      setConfirmName('')
      router.refresh()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {tournaments.map(t => (
          <div
            key={t.id}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1.25rem',
              flexWrap: 'wrap',
              cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
              borderLeft: leagueColor ? `3px solid ${leagueColor}` : undefined,
            }}
            onClick={() => router.push(`/dashboard/leagues/${leagueId}/tournaments/${t.id}`)}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--gold-border)'
              e.currentTarget.style.background = 'var(--surface2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = ''
              e.currentTarget.style.background = ''
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', marginBottom: '0.2rem' }}>
                {t.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span>{new Date(t.date).toLocaleDateString()}</span>
                <span>{t.course}</span>
                <span>{t.format}</span>
              </div>
            </div>

            <Badge status={t.status}>{t.status}</Badge>

            <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
              <Link
                href={`/dashboard/leagues/${leagueId}/tournaments/${t.id}`}
                className="btn btn-outline btn-sm"
              >
                Manage
              </Link>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--over)' }}
                onClick={() => { setDeleteTarget(t); setConfirmName('') }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setConfirmName('') }}
        title="Delete Tournament"
        confirmLabel="Delete Permanently"
        confirmDisabled={confirmName !== deleteTarget?.name}
        confirmLoading={deleting}
        onConfirm={handleDelete}
        destructive
      >
        <p style={{ marginBottom: '0.75rem' }}>
          This will permanently delete <strong style={{ color: 'var(--text)' }}>{deleteTarget?.name}</strong> and all associated data (holes, players, groups, scores).
        </p>
        <p style={{ marginBottom: '0.75rem' }}>
          Type the tournament name to confirm:
        </p>
        <Input
          value={confirmName}
          onChange={e => setConfirmName(e.target.value)}
          placeholder={deleteTarget?.name}
        />
      </Modal>
    </>
  )
}
