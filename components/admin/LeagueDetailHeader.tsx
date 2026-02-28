'use client'

import { useState } from 'react'
import EditLeagueModal from './EditLeagueModal'
import DeleteLeagueModal from './DeleteLeagueModal'
import type { League } from '@/lib/types'

interface LeagueDetailHeaderProps {
  league: League
}

export default function LeagueDetailHeader({ league }: LeagueDetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      {/* League info bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          padding: '0.875rem 1.25rem',
          borderLeft: '3px solid var(--league-accent)',
          flexWrap: 'wrap',
        }}
      >
        {/* Logo or color swatch */}
        {league.logo_url ? (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '4px',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface2)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={league.logo_url}
              alt={`${league.name} logo`}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--league-accent)',
              flexShrink: 0,
            }}
          />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="section-tag">League Settings</span>
        </div>

        {/* Edit + Delete buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setEditOpen(true)}
            title="Edit league"
            style={{ fontSize: '0.72rem' }}
          >
            Edit
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setDeleteOpen(true)}
            title="Delete league"
            style={{ fontSize: '0.72rem', color: 'var(--over)' }}
          >
            Delete
          </button>
        </div>
      </div>

      <EditLeagueModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        league={league}
      />

      <DeleteLeagueModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        leagueId={league.id}
        leagueName={league.name}
      />
    </>
  )
}
