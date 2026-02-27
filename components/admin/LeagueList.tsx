'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { League } from '@/lib/types'
import EditLeagueModal from '@/components/admin/EditLeagueModal'
import DeleteLeagueModal from '@/components/admin/DeleteLeagueModal'

export interface LeagueWithCount extends League {
  tournamentCount: number
}

export default function LeagueList({ leagues }: { leagues: LeagueWithCount[] }) {
  const [editTarget, setEditTarget] = useState<LeagueWithCount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LeagueWithCount | null>(null)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {leagues.map(league => {
          const color = league.primary_color || '#1a5c2a'
          return (
            <div
              key={league.id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.875rem 1.25rem',
                borderLeft: `3px solid ${color}`,
              }}
            >
              <Link
                href={`/dashboard/leagues/${league.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flex: 1,
                  minWidth: 0,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                {/* Logo or color circle */}
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
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                    }}
                  >
                    ⛳
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', marginBottom: '0.15rem' }}>
                    {league.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>{league.tournamentCount} tournament{league.tournamentCount !== 1 ? 's' : ''}</span>
                    <span>Created {new Date(league.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <span style={{ color: 'var(--text-dim)', fontSize: '1.2rem', flexShrink: 0 }}>&rarr;</span>
              </Link>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setEditTarget(league)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--over)' }}
                  onClick={() => setDeleteTarget(league)}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {editTarget && (
        <EditLeagueModal
          key={editTarget.id}
          open={true}
          onClose={() => setEditTarget(null)}
          league={editTarget}
        />
      )}

      {deleteTarget && (
        <DeleteLeagueModal
          open={true}
          onClose={() => setDeleteTarget(null)}
          leagueId={deleteTarget.id}
          leagueName={deleteTarget.name}
        />
      )}
    </>
  )
}
