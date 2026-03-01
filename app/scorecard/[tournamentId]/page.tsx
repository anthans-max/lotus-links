import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ScorecardTable from '@/components/scorecard/ScorecardTable'
import PoweredByFooter from '@/components/ui/PoweredByFooter'
import SendScorecardButton from '@/components/admin/SendScorecardButton'
import { computeCourseHandicap, getStrokesOnHole } from '@/lib/scoring/handicap'
import { computeStablefordPoints, parseStablefordConfig } from '@/lib/scoring/stableford'

export const metadata: Metadata = {
  title: 'Scorecard',
}

interface Props {
  params: Promise<{ tournamentId: string }>
}

export default async function ScorecardPage({ params }: Props) {
  const { tournamentId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = !!user

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, date, course, format, holes, status, leaderboard_public, league_id, slope_rating, course_rating, stableford_points_config')
    .eq('id', tournamentId)
    .single()

  if (!tournament) {
    return <NotFoundView />
  }

  // Gate: Scramble format not supported
  if (tournament.format === 'Scramble') {
    return <ScrambleNotAvailableView />
  }

  // Gate: coming soon before tournament day
  const today = new Date().toISOString().split('T')[0]
  const tournamentDate = tournament.date ? tournament.date.split('T')[0] : ''
  if (!tournament.leaderboard_public && today < tournamentDate) {
    return <ComingSoonView tournamentName={tournament.name} tournamentDate={tournament.date} />
  }

  // Fetch in parallel
  const [{ data: league }, { data: holes }, { data: players }, { data: scores }] = await Promise.all([
    supabase.from('leagues').select('name, primary_color, logo_url').eq('id', tournament.league_id).single(),
    supabase.from('holes').select('hole_number, par, handicap').eq('tournament_id', tournamentId).order('hole_number'),
    supabase.from('players').select('id, name, handicap, handicap_index').eq('tournament_id', tournamentId).order('name'),
    supabase.from('scores').select('player_id, hole_number, strokes').eq('tournament_id', tournamentId).not('player_id', 'is', null),
  ])

  const holeList = (holes ?? []).map(h => ({
    number: h.hole_number,
    par: h.par,
    strokeIndex: h.handicap as number | null,
  }))

  const totalPar = holeList.reduce((s, h) => s + h.par, 0)
  const holeCount = tournament.holes ?? holeList.length
  const stablefordConfig = parseStablefordConfig(tournament.stableford_points_config)
  const slope = tournament.slope_rating ?? 113
  const courseRating = tournament.course_rating ?? totalPar

  // Build score lookup: playerId → holeNumber → strokes
  const scoreMap = new Map<string, Map<number, number>>()
  for (const s of scores ?? []) {
    if (!s.player_id) continue
    if (!scoreMap.has(s.player_id)) scoreMap.set(s.player_id, new Map())
    scoreMap.get(s.player_id)!.set(s.hole_number, s.strokes)
  }

  // Compute per-player data
  const midpoint = Math.floor(holeCount / 2)
  const computedPlayers = (players ?? []).map(p => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handicapIndex = (p as any).handicap_index as number | null
    const hasHandicap = handicapIndex != null || (p.handicap != null && p.handicap > 0)
    const courseHcp = handicapIndex != null
      ? computeCourseHandicap(handicapIndex, slope, courseRating, totalPar)
      : (p.handicap ?? 0)

    const playerScores = scoreMap.get(p.id) ?? new Map<number, number>()

    const rows = holeList.map(h => {
      const raw = playerScores.get(h.number) ?? null
      const received = courseHcp > 0 ? getStrokesOnHole(courseHcp, h.strokeIndex, holeCount) : 0
      const net = raw != null ? raw - received : null
      const pts = raw != null ? computeStablefordPoints(raw, h.par, received, stablefordConfig) : null
      return { holeNumber: h.number, raw, net, pts, received }
    })

    const outRows = rows.filter(r => r.holeNumber <= midpoint)
    const inRows = rows.filter(r => r.holeNumber > midpoint)

    const sumGross = (rs: typeof rows) => rs.reduce((s, r) => s + (r.raw ?? 0), 0)
    const sumNet = (rs: typeof rows) => rs.reduce((s, r) => s + (r.net ?? 0), 0)
    const sumPts = (rs: typeof rows) => rs.reduce((s, r) => s + (r.pts ?? 0), 0)

    return {
      id: p.id,
      name: p.name,
      courseHandicap: courseHcp,
      hasHandicap,
      rows,
      outGross: sumGross(outRows),
      inGross: sumGross(inRows),
      totalGross: sumGross(rows),
      outNet: sumNet(outRows),
      inNet: sumNet(inRows),
      totalNet: sumNet(rows),
      outPts: sumPts(outRows),
      inPts: sumPts(inRows),
      totalPts: sumPts(rows),
    }
  })

  // Sort by totalPts DESC (leaderboard order)
  const sortedPlayers = [...computedPlayers].sort((a, b) => b.totalPts - a.totalPts)

  const formattedDate = (() => {
    try {
      return new Date(tournament.date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    } catch {
      return tournament.date
    }
  })()

  const formatBadgeColor = tournament.format === 'Stableford' ? 'var(--gold)' : 'var(--text-muted)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--forest), var(--surface2))', borderBottom: '1px solid var(--gold-border)', padding: '1.5rem 1.25rem 1.25rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Back link */}
          <a
            href={`/leaderboard/${tournamentId}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '1rem', fontFamily: 'var(--fm)' }}
          >
            ← Leaderboard
          </a>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {league && (league as any).logo_url && (
              /* eslint-disable-next-line @next/next/no-img-element, @typescript-eslint/no-explicit-any */
              <img src={(league as any).logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain' }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                {tournament.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
                {tournament.course} · {formattedDate}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', border: '1px solid var(--border2)', borderRadius: 4, color: formatBadgeColor, fontFamily: 'var(--fm)', letterSpacing: '0.06em' }}>
                {tournament.format}
              </span>
              {isAdmin && <SendScorecardButton tournamentId={tournamentId} />}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ maxWidth: 900, margin: '1.5rem auto 0', padding: '0 1rem' }}>
        {sortedPlayers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            No scores have been entered yet.
          </div>
        ) : (
          <ScorecardTable
            holes={holeList}
            players={sortedPlayers}
            format={tournament.format}
            holeCount={holeCount}
          />
        )}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1rem' }}>
        <PoweredByFooter />
      </div>
    </div>
  )
}

function NotFoundView() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛳</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
          Tournament Not Found
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          This scorecard link doesn&apos;t match any tournament.
        </p>
      </div>
    </div>
  )
}

function ScrambleNotAvailableView() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
          Not Available for Scramble
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Individual scorecards are only available for Stableford and Stroke Play tournaments.
        </p>
      </div>
    </div>
  )
}

function ComingSoonView({ tournamentName, tournamentDate }: { tournamentName: string; tournamentDate: string }) {
  const formattedDate = (() => {
    try {
      return new Date(tournamentDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    } catch {
      return tournamentDate
    }
  })()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), #5a3e10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>⛳</div>
          <span style={{ fontFamily: 'var(--fd)', fontSize: '0.9rem', color: 'var(--gold)' }}>Lotus Links</span>
        </div>

        <div style={{ background: 'linear-gradient(135deg, var(--forest), var(--surface2))', border: '1px solid var(--gold-border)', borderRadius: 12, padding: '2.5rem 2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '8rem', opacity: 0.04, pointerEvents: 'none' }}>📋</div>
          <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🏌️</div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text)' }}>
            Scorecard Coming Soon
          </div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: '1.1rem', color: 'var(--gold)', marginBottom: '1rem' }}>
            {tournamentName}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            The full scorecard will be available on tournament day. Check back on:
          </p>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1.25rem', display: 'inline-block' }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: '1rem', color: 'var(--gold)' }}>
              {formattedDate}
            </div>
          </div>
        </div>

        <PoweredByFooter />
      </div>
    </div>
  )
}
