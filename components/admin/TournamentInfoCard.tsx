'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import EditTournamentModal from '@/components/admin/EditTournamentModal'
import DeleteTournamentModal from '@/components/admin/DeleteTournamentModal'
import type { Tournament } from '@/lib/types'

interface TournamentInfoCardProps {
  tournament: Tournament
  leagueId: string
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div style={{ fontSize: '0.95rem' }}>{value}</div>
    </div>
  )
}

export default function TournamentInfoCard({ tournament, leagueId }: TournamentInfoCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', flex: 1 }}>
            <Badge status={tournament.status}>{tournament.status}</Badge>
            <InfoItem label="Date" value={new Date(tournament.date + 'T12:00:00').toLocaleDateString()} />
            <InfoItem label="Course" value={tournament.course} />
            <InfoItem label="Format" value={tournament.format} />
            <InfoItem label="Holes" value={`${tournament.holes}`} />
            {tournament.shotgun_start && (
              <span className="badge badge-gold">Shotgun</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setEditOpen(true)}>
              Edit
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setDeleteOpen(true)}
              style={{ color: 'var(--over)' }}>
              Delete
            </button>
          </div>
        </div>
        {tournament.notes && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
            {tournament.notes}
          </p>
        )}
      </Card>

      <EditTournamentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        tournament={tournament}
      />

      <DeleteTournamentModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        tournamentId={tournament.id}
        tournamentName={tournament.name}
        leagueId={leagueId}
      />
    </>
  )
}
