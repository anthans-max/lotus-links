import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('tournaments')
    .select('name')
    .eq('public_token', token)
    .single()
  return { title: data ? `${data.name} — Group Pairings` : 'Group Pairings' }
}

export default async function PairingsPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, date, course, league_id')
    .eq('public_token', token)
    .single()

  if (!tournament) notFound()

  const [{ data: league }, { data: groups }, { data: players }] = await Promise.all([
    supabase.from('leagues').select('name, primary_color, logo_url').eq('id', tournament.league_id).single(),
    supabase.from('groups').select('*, group_players(player_id)').eq('tournament_id', tournament.id),
    supabase.from('players').select('id, name, grade').eq('tournament_id', tournament.id),
  ])

  const groupIds = (groups ?? []).map(g => g.id)
  const { data: gcRows } = groupIds.length > 0
    ? await supabase.from('group_chaperones').select('group_id, chaperones(id, name)').in('group_id', groupIds)
    : { data: [] as { group_id: string; chaperones: unknown }[] }

  const playerMap = new Map((players ?? []).map(p => [p.id, p]))

  // Build groupId → chaperone names[]
  const chapMap: Record<string, string[]> = {}
  for (const row of gcRows ?? []) {
    const chap = (row.chaperones as unknown) as { id: string; name: string } | null
    if (!chap) continue
    if (!chapMap[row.group_id]) chapMap[row.group_id] = []
    chapMap[row.group_id].push(chap.name)
  }

  const accentColor = (league as any)?.primary_color || '#1a5c2a'

  function formatTeeTime(t: string) {
    const [h, m] = t.split(':')
    const hour = parseInt(h, 10)
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'pm' : 'am'}`
  }

  function formatDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const sortedGroups = [...(groups ?? [])].sort((a, b) => {
    if (!a.tee_time && !b.tee_time) return (a.name ?? '').localeCompare(b.name ?? '')
    if (!a.tee_time) return 1
    if (!b.tee_time) return -1
    const timeCmp = a.tee_time.localeCompare(b.tee_time)
    return timeCmp !== 0 ? timeCmp : (a.name ?? '').localeCompare(b.name ?? '')
  })

  const totalPlayers = (groups ?? []).reduce((n, g) => n + (g.group_players as { player_id: string }[]).length, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '1.5rem 1rem 3rem', '--league-accent': accentColor } as React.CSSProperties}>
      {/* Header */}
      <div style={{ maxWidth: 900, margin: '0 auto 2rem' }}>
        {(league as any)?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(league as any).logo_url} alt="League logo" style={{ height: 48, marginBottom: '0.75rem', objectFit: 'contain' }} />
        )}
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.6rem', color: 'var(--gold)', lineHeight: 1.15 }}>
          {tournament.name}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontFamily: 'var(--fm)', letterSpacing: '0.04em' }}>
          {formatDate(tournament.date)} &middot; {tournament.course}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.5rem', fontFamily: 'var(--fm)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {sortedGroups.length} group{sortedGroups.length !== 1 ? 's' : ''} &middot; {totalPlayers} player{totalPlayers !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Group grid */}
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {sortedGroups.map(group => {
          const memberIds = (group.group_players as { player_id: string }[]).map(gp => gp.player_id)
          const members = memberIds.map(id => playerMap.get(id)).filter(Boolean) as { id: string; name: string; grade: string | null }[]
          const chapNames = chapMap[group.id] ?? []

          return (
            <div key={group.id} className="card" style={{ borderTop: '2px solid var(--gold-border)', padding: '0.9rem 1rem' }}>
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', color: 'var(--text)' }}>
                  {group.name}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                  {group.tee_time && (
                    <span className="badge badge-gold" style={{ fontFamily: 'var(--fm)', fontSize: '0.65rem' }}>
                      {formatTeeTime(group.tee_time)}
                    </span>
                  )}
                </div>
              </div>

              {/* Chaperones */}
              {chapNames.length > 0 && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', marginBottom: '0.55rem', letterSpacing: '0.02em' }}>
                  <span style={{ color: 'var(--gold)', marginRight: '0.3rem', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Chaperone</span>
                  {chapNames.join(', ')}
                </div>
              )}

              {/* Players */}
              {members.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {members.map((p, i) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.35rem 0',
                        borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--gold)', flexShrink: 0, fontFamily: 'var(--fm)' }}>
                        {p.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.83rem', color: 'var(--text)' }}>{p.name}</div>
                        {p.grade && (
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)' }}>Grade {p.grade}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No players assigned</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
