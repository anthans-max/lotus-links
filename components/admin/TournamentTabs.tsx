'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { key: 'overview', label: 'Overview', path: '' },
  { key: 'holes', label: 'Holes', path: '/holes' },
  { key: 'players', label: 'Players', path: '/players' },
  { key: 'groups', label: 'Groups', path: '/groups' },
  { key: 'scores', label: 'Scores', path: '/scores' },
  { key: 'leaderboard', label: 'Leaderboard ↗', path: '/leaderboard', external: true },
] as const

interface TournamentTabsProps {
  leagueId: string
  tournamentId: string
}

export default function TournamentTabs({ leagueId, tournamentId }: TournamentTabsProps) {
  const pathname = usePathname()
  const basePath = `/dashboard/leagues/${leagueId}/tournaments/${tournamentId}`

  const activeTab = TABS.find(tab => {
    if (tab.key === 'leaderboard') return false
    const fullPath = basePath + tab.path
    if (tab.key === 'overview') return pathname === basePath
    return pathname === fullPath
  })?.key ?? 'overview'

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: 0, minWidth: 'max-content' }}>
        {TABS.map(tab => {
          if (tab.key === 'leaderboard') {
            return (
              <a
                key={tab.key}
                href={`/leaderboard/${tournamentId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-tab"
                style={{
                  whiteSpace: 'nowrap',
                  padding: '0.65rem 1rem',
                  fontSize: '0.78rem',
                  textDecoration: 'none',
                }}
              >
                {tab.label}
              </a>
            )
          }
          const href = basePath + tab.path
          const isActive = tab.key === activeTab
          return (
            <Link
              key={tab.key}
              href={href}
              className={`nav-tab ${isActive ? 'act' : ''}`}
              style={{
                whiteSpace: 'nowrap',
                padding: '0.65rem 1rem',
                fontSize: '0.78rem',
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
