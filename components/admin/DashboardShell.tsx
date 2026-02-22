'use client'

import { useState } from 'react'
import type { Tournament, Hole, Player, Group, GroupPlayer, Score } from '@/lib/types'
import AdminNav, { type TabKey } from './AdminNav'
import DashboardHome from './DashboardHome'
import TournamentSetup from './TournamentSetup'
import PlayersPanel from './PlayersPanel'
import GroupsPanel from './GroupsPanel'

export interface DashboardData {
  tournament: Tournament | null
  holes: Hole[]
  players: Player[]
  groups: (Group & { group_players: GroupPlayer[] })[]
  scores: Score[]
}

interface DashboardShellProps {
  data: DashboardData
}

export default function DashboardShell({ data }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(
    data.tournament ? 'dashboard' : 'setup'
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AdminNav activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'dashboard' && (
        <DashboardHome data={data} onNavigate={setActiveTab} />
      )}
      {activeTab === 'setup' && (
        <TournamentSetup
          tournament={data.tournament}
          holes={data.holes}
          onCreated={() => setActiveTab('dashboard')}
        />
      )}
      {activeTab === 'players' && (
        <PlayersPanel
          tournament={data.tournament}
          players={data.players}
        />
      )}
      {activeTab === 'groups' && (
        <GroupsPanel
          tournament={data.tournament}
          players={data.players}
          groups={data.groups}
        />
      )}
    </div>
  )
}
