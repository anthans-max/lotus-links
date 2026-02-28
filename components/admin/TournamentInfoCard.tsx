'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import EditTournamentModal from '@/components/admin/EditTournamentModal'
import type { Tournament } from '@/lib/types'

interface TournamentInfoCardProps {
  tournament: Tournament
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div style={{ fontSize: '0.95rem' }}>{value}</div>
    </div>
  )
}

export default function TournamentInfoCard({ tournament }: TournamentInfoCardProps) {
  const [editOpen, setEditOpen] = useState(false)

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
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setEditOpen(true)}
            style={{ flexShrink: 0 }}
          >
            Edit
          </button>
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
    </>
  )
}
