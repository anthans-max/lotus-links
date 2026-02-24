'use client'

import type { TabKey } from './AdminNav'
import type { DashboardData } from './DashboardShell'

interface DashboardHomeProps {
  data: DashboardData
  onNavigate: (tab: TabKey) => void
}

export default function DashboardHome({ data, onNavigate }: DashboardHomeProps) {
  const { tournament, holes, players, groups, scores } = data

  if (!tournament) {
    return (
      <div className="section">
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg,var(--forest) 0%,var(--surface) 100%)',
            border: '1px solid var(--gold-border)',
            borderRadius: 2,
            padding: '2.5rem',
            overflow: 'hidden',
            animation: 'fadeUp 0.6s ease',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛳</div>
          <h1
            style={{
              fontFamily: 'var(--fd)',
              fontSize: 'clamp(1.75rem,5vw,2.5rem)',
              fontWeight: 400,
              color: 'var(--text)',
              marginBottom: '0.75rem',
              lineHeight: 1.1,
            }}
          >
            Welcome to <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Lotus Links</em>
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Get started by creating your tournament.
          </p>
          <button className="btn btn-gold" onClick={() => onNavigate('setup')}>
            Create Tournament &rarr;
          </button>
        </div>
      </div>
    )
  }

  const totalPar = holes.reduce((sum, h) => sum + h.par, 0)
  const holesCompleted = new Set(scores.map(s => s.hole_number)).size
  const groupCount = groups.length
  const playerCount = players.length

  // Compute leaderboard: total strokes per group
  const groupScores = groups.map(g => {
    const groupScoreList = scores.filter(s => s.group_id === g.id)
    const total = groupScoreList.reduce((sum, s) => sum + s.strokes, 0)
    const completed = new Set(groupScoreList.map(s => s.hole_number)).size
    return {
      id: g.id,
      name: g.name,
      chaperone: g.chaperone_name,
      total,
      completed,
      toPar: total - (totalPar * (completed > 0 ? completed / holes.length : 0)),
    }
  }).filter(g => g.completed > 0).sort((a, b) => a.total - b.total)

  const fmtScore = (n: number) => {
    const rounded = Math.round(n)
    return rounded === 0 ? 'E' : rounded > 0 ? `+${rounded}` : String(rounded)
  }

  return (
    <div className="section">
      {/* Hero */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg,var(--forest) 0%,var(--surface) 100%)',
          border: '1px solid var(--gold-border)',
          borderRadius: 2,
          padding: '2.5rem',
          marginBottom: '1.5rem',
          overflow: 'hidden',
          animation: 'fadeUp 0.6s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '40%',
            height: '100%',
            background: 'radial-gradient(ellipse at right,rgba(200,168,75,0.08),transparent)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            right: -20,
            fontSize: '8rem',
            opacity: 0.04,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          ⛳
        </div>
        <span className="section-tag">WISH Charter School</span>
        <div className="gold-divider" />
        <h1
          style={{
            fontFamily: 'var(--fd)',
            fontSize: 'clamp(1.75rem,4vw,2.5rem)',
            fontWeight: 400,
            color: 'var(--text)',
            marginBottom: '0.5rem',
            lineHeight: 1.1,
          }}
        >
          {tournament.name}
          <br />
          <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>{tournament.format}</em>
        </h1>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}
        >
          {tournament.course} &middot; {tournament.date} &middot; {holes.length} Holes &middot; Par {totalPar}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-gold" onClick={() => onNavigate('groups')}>
            Manage Groups &rarr;
          </button>
          <button className="btn btn-outline" onClick={() => onNavigate('setup')}>
            Tournament Settings
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="g4" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Registered Players', value: String(playerCount), sub: `${groupCount} groups`, icon: '👤' },
          { label: 'Holes', value: String(holes.length), sub: `Par ${totalPar}`, icon: '🏌️' },
          { label: 'Groups Created', value: String(groupCount), sub: `${groups.reduce((s, g) => s + g.group_players.length, 0)} assigned`, icon: '👥' },
          { label: 'Tournament Format', value: tournament.format, sub: tournament.status, icon: '📊' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ animation: `fadeUp 0.6s ease ${i * 0.08}s both` }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
            <div className="label">{s.label}</div>
            <div
              style={{
                fontFamily: 'var(--fd)',
                fontSize: '1.4rem',
                fontWeight: 400,
                color: 'var(--text)',
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Mini leaderboard + quick actions */}
      <div className="g2">
        {/* Mini leaderboard */}
        <div className="card card-gold">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div className="label">Live Leaderboard</div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', color: 'var(--text)' }}>
                Top Groups
              </div>
            </div>
            {groupScores.length > 0 && (
              <span className="badge badge-green pulse">LIVE</span>
            )}
          </div>
          {groupScores.length > 0 ? (
            groupScores.slice(0, 5).map((g, i) => (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0',
                  borderBottom: i < Math.min(groupScores.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div className={`pos-badge pos-${i + 1 <= 3 ? i + 1 : 'n'}`}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{g.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>
                    {g.completed}/{holes.length} holes
                  </div>
                </div>
                <div
                  style={{ fontFamily: 'var(--fm)', fontSize: '0.9rem' }}
                  className={g.toPar < 0 ? 'score-under' : g.toPar > 0 ? 'score-over' : 'score-even'}
                >
                  {fmtScore(g.toPar)}
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
              No scores submitted yet. Scores will appear here once chaperones start entering them.
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="label" style={{ marginBottom: '0.75rem' }}>
              Tournament Status
            </div>
            {[
              {
                label: 'Tournament Created',
                status: 'complete' as const,
              },
              {
                label: `${playerCount} Players Registered`,
                status: playerCount > 0 ? 'complete' as const : 'pending' as const,
              },
              {
                label: `${groupCount} Groups Formed`,
                status: groupCount > 0 ? 'complete' as const : 'pending' as const,
              },
              {
                label: 'Scoring In Progress',
                status: scores.length > 0 ? 'live' as const : 'pending' as const,
              },
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0',
                  borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background:
                      r.status === 'live'
                        ? '#4CAF50'
                        : r.status === 'complete'
                          ? 'var(--gold)'
                          : 'var(--surface3)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)' }}>{r.label}</div>
                <span
                  className={`badge ${
                    r.status === 'live'
                      ? 'badge-green'
                      : r.status === 'complete'
                        ? 'badge-gold'
                        : 'badge-gray'
                  }`}
                >
                  {r.status === 'live' ? 'LIVE' : r.status === 'complete' ? 'Done' : 'Pending'}
                </span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="label" style={{ marginBottom: '0.75rem' }}>
              Quick Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Manage Players', icon: '👥', fn: () => onNavigate('players') },
                { label: 'Manage Groups', icon: '🎯', fn: () => onNavigate('groups') },
                { label: 'Tournament Settings', icon: '⚙️', fn: () => onNavigate('setup') },
              ].map(a => (
                <button
                  key={a.label}
                  className="btn btn-ghost"
                  style={{ justifyContent: 'flex-start', gap: '0.6rem', width: '100%' }}
                  onClick={a.fn}
                >
                  <span>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
