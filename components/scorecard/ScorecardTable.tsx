'use client'

import React from 'react'

interface HoleInfo {
  number: number
  par: number
  strokeIndex: number | null
  yardage: number | null
}

interface PlayerRow {
  holeNumber: number
  raw: number | null
  adjScore: number | null
  pts: number | null
  received: number
}

interface PlayerData {
  id: string
  name: string
  courseHandicap: number
  hasHandicap: boolean
  rows: PlayerRow[]
  outGross: number
  inGross: number
  totalGross: number
  outAdj: number
  inAdj: number
  totalAdj: number
  outPts: number
  inPts: number
  totalPts: number
}

interface Props {
  holes: HoleInfo[]
  players: PlayerData[]
  format: string
  holeCount: number
}

// ─── Score decorator matching GHIN style ──────────────────────────────────────

function ScoreDecorator({ score, par }: { score: number | null; par: number }) {
  if (score == null) return <span style={{ color: 'var(--text-dim)' }}>—</span>
  const rel = score - par
  const gold = 'var(--gold)'
  const txt: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 600, color: gold, lineHeight: 1 }

  if (rel <= -2) {
    // Eagle or better: double circle
    return (
      <span style={{ display: 'inline-block', border: `1px solid ${gold}`, borderRadius: '50%', padding: 3, lineHeight: 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${gold}`, borderRadius: '50%', width: 18, height: 18, ...txt }}>
          {score}
        </span>
      </span>
    )
  }
  if (rel === -1) {
    // Birdie: single circle
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${gold}`, borderRadius: '50%', width: 22, height: 22, ...txt }}>
        {score}
      </span>
    )
  }
  if (rel === 0) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{score}</span>
  }
  if (rel === 1) {
    // Bogey: single square
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${gold}`, width: 22, height: 22, ...txt }}>
        {score}
      </span>
    )
  }
  // Double bogey+: double square
  return (
    <span style={{ display: 'inline-block', border: `1px solid ${gold}`, padding: 2, lineHeight: 0 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${gold}`, width: 16, height: 16, ...txt }}>
        {score}
      </span>
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScorecardTable({ holes, players, format, holeCount }: Props) {
  const isStableford = format === 'Stableford'
  const midpoint = Math.floor(holeCount / 2)
  const outHoles = holes.filter(h => h.number <= midpoint)
  const inHoles = holes.filter(h => h.number > midpoint)
  const showInOut = midpoint > 0 && inHoles.length > 0
  const orderedHoles = [...outHoles, ...inHoles]

  const outPar = outHoles.reduce((s, h) => s + h.par, 0)
  const inPar = inHoles.reduce((s, h) => s + h.par, 0)
  const totalPar = outPar + inPar

  const outYards = outHoles.reduce((s, h) => s + (h.yardage || 0), 0)
  const inYards = inHoles.reduce((s, h) => s + (h.yardage || 0), 0)
  const totalYards = outYards + inYards
  const hasYardage = holes.some(h => h.yardage != null)

  // Total column count for separator row colSpan
  const totalCols = 1 + orderedHoles.length + (showInOut ? 2 : 0) + 1

  // ─── Style tokens ────────────────────────────────────────────────────────

  const stickyLabel: React.CSSProperties = {
    position: 'sticky',
    left: 0,
    zIndex: 2,
    background: 'var(--forest)',
    minWidth: 88,
    padding: '6px 8px',
    fontFamily: 'var(--fm)',
    fontSize: '0.68rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    fontWeight: 700,
    borderRight: '1px solid var(--border2)',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  }

  const holeHdrCell: React.CSSProperties = {
    padding: '6px 4px',
    textAlign: 'center',
    fontFamily: 'var(--fm)',
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--gold)',
    background: 'var(--forest)',
    minWidth: 34,
    borderRight: '1px solid rgba(255,255,255,0.06)',
    verticalAlign: 'middle',
  }

  const totHdrCell: React.CSSProperties = {
    ...holeHdrCell,
    background: 'rgba(200,168,75,0.08)',
    borderLeft: '1px solid var(--border2)',
    minWidth: 44,
    color: 'var(--gold)',
  }

  const subLabelMuted: React.CSSProperties = {
    ...stickyLabel,
    background: 'var(--surface2)',
    fontSize: '0.62rem',
    fontWeight: 400,
    color: 'var(--text-dim)',
    letterSpacing: '0.07em',
  }

  const subLabelNormal: React.CSSProperties = {
    ...stickyLabel,
    background: 'var(--surface2)',
    color: 'var(--text-muted)',
  }

  const subLabelSI: React.CSSProperties = {
    ...stickyLabel,
    background: 'var(--surface2)',
    fontSize: '0.6rem',
    fontWeight: 400,
    color: 'var(--text-dim)',
    letterSpacing: '0.07em',
    whiteSpace: 'normal',
    lineHeight: 1.25,
  }

  const dataCell: React.CSSProperties = {
    padding: '5px 3px',
    textAlign: 'center',
    fontFamily: 'var(--fm)',
    fontSize: '0.78rem',
    minWidth: 34,
    borderRight: '1px solid var(--border)',
    verticalAlign: 'middle',
  }

  const totDataCell: React.CSSProperties = {
    ...dataCell,
    background: 'rgba(200,168,75,0.06)',
    fontWeight: 700,
    borderLeft: '1px solid var(--border2)',
    minWidth: 44,
  }

  const outInDataCell: React.CSSProperties = {
    ...dataCell,
    background: 'var(--surface2)',
    fontWeight: 600,
    borderLeft: '2px solid var(--border2)',
    borderRight: '1px solid var(--border2)',
  }

  const scoreLabelCell: React.CSSProperties = {
    ...stickyLabel,
    background: 'var(--surface)',
    zIndex: 2,
  }

  const adjLabelCell: React.CSSProperties = {
    ...stickyLabel,
    background: 'var(--surface)',
    fontSize: '0.6rem',
    fontWeight: 400,
    color: 'var(--text-muted)',
    whiteSpace: 'normal',
    lineHeight: 1.25,
  }

  const ptsLabelCell: React.CSSProperties = {
    ...stickyLabel,
    background: 'var(--surface)',
    color: 'var(--gold)',
  }

  // ─── Render helpers ──────────────────────────────────────────────────────

  /** Renders a data cell for a hole with optional OUT/IN injection */
  function renderHoleCells(
    renderCell: (h: HoleInfo, isFirstIn: boolean) => React.ReactNode,
    outVal: React.ReactNode,
    inVal: React.ReactNode,
    totVal: React.ReactNode,
  ) {
    const cells: React.ReactNode[] = []
    orderedHoles.forEach((h, i) => {
      const isFirstIn = showInOut && i === outHoles.length
      cells.push(renderCell(h, isFirstIn))
      if (showInOut && i === outHoles.length - 1) {
        cells.push(<td key="out" style={outInDataCell}>{outVal}</td>)
      }
    })
    if (showInOut) {
      cells.push(<td key="in" style={outInDataCell}>{inVal}</td>)
    }
    cells.push(<td key="tot" style={totDataCell}>{totVal}</td>)
    return cells
  }

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>

        {/* ── Shared header rows ── */}
        <thead>
          {/* HOLE row */}
          <tr>
            <th style={{ ...stickyLabel, zIndex: 3 }}>HOLE</th>
            {outHoles.map(h => (
              <th key={h.number} style={holeHdrCell}>{h.number}</th>
            ))}
            {showInOut && (
              <th style={{ ...holeHdrCell, background: 'rgba(200,168,75,0.05)', color: 'rgba(200,168,75,0.55)', minWidth: 44, borderLeft: '2px solid var(--border2)' }}>
                OUT
              </th>
            )}
            {inHoles.map(h => (
              <th key={h.number} style={holeHdrCell}>{h.number}</th>
            ))}
            {showInOut && (
              <th style={{ ...holeHdrCell, background: 'rgba(200,168,75,0.05)', color: 'rgba(200,168,75,0.55)', minWidth: 44, borderLeft: '2px solid var(--border2)' }}>
                IN
              </th>
            )}
            <th style={totHdrCell}>TOTAL</th>
          </tr>

          {/* YARDS row */}
          {hasYardage && (
            <tr>
              <th style={{ ...subLabelMuted, zIndex: 3, borderTop: '1px solid var(--border)' }}>YARDS</th>
              {renderHoleCells(
                (h, isFirstIn) => (
                  <td key={h.number} style={{ ...dataCell, color: 'var(--text-dim)', fontSize: '0.72rem', borderTop: '1px solid var(--border)', ...(isFirstIn ? { borderLeft: '2px solid var(--border2)' } : {}) }}>
                    {h.yardage ?? '—'}
                  </td>
                ),
                outYards || '—',
                inYards || '—',
                <span style={{ color: 'var(--text-muted)' }}>{totalYards || '—'}</span>,
              )}
            </tr>
          )}

          {/* PAR row */}
          <tr>
            <th style={{ ...subLabelNormal, zIndex: 3, borderTop: '1px solid var(--border)' }}>PAR</th>
            {renderHoleCells(
              (h, isFirstIn) => (
                <td key={h.number} style={{ ...dataCell, color: 'rgba(138,173,138,0.85)', borderTop: '1px solid var(--border)', ...(isFirstIn ? { borderLeft: '2px solid var(--border2)' } : {}) }}>
                  {h.par}
                </td>
              ),
              <span style={{ color: 'rgba(138,173,138,0.85)' }}>{outPar}</span>,
              <span style={{ color: 'rgba(138,173,138,0.85)' }}>{inPar}</span>,
              <span style={{ color: 'rgba(138,173,138,0.85)', fontWeight: 700 }}>{totalPar}</span>,
            )}
          </tr>

          {/* STROKE INDEX row */}
          <tr>
            <th style={{ ...subLabelSI, zIndex: 3, borderTop: '1px solid var(--border)' }}>
              STROKE<br />INDEX
            </th>
            {renderHoleCells(
              (h, isFirstIn) => (
                <td key={h.number} style={{ ...dataCell, color: 'var(--text-dim)', fontSize: '0.72rem', borderTop: '1px solid var(--border)', ...(isFirstIn ? { borderLeft: '2px solid var(--border2)' } : {}) }}>
                  {h.strokeIndex ?? '—'}
                </td>
              ),
              '—',
              '—',
              '—',
            )}
          </tr>
        </thead>

        {/* ── Per-player rows ── */}
        <tbody>
          {players.map((player) => {
            const holeMap = new Map(player.rows.map(r => [r.holeNumber, r]))

            return (
              <React.Fragment key={player.id}>

                {/* Player name separator */}
                <tr>
                  <td
                    colSpan={totalCols}
                    style={{
                      padding: '7px 10px',
                      background: 'var(--surface)',
                      borderTop: '2px solid var(--border2)',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: 'var(--fb)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}
                  >
                    {player.name}
                    {player.hasHandicap && (
                      <span style={{ marginLeft: '0.6rem', fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', fontWeight: 400 }}>
                        HCP {player.courseHandicap}
                      </span>
                    )}
                  </td>
                </tr>

                {/* SCORE row */}
                <tr>
                  <td style={scoreLabelCell}>SCORE</td>
                  {renderHoleCells(
                    (h, isFirstIn) => {
                      const r = holeMap.get(h.number)
                      return (
                        <td key={h.number} style={{ ...dataCell, position: 'relative', ...(isFirstIn ? { borderLeft: '2px solid var(--border2)' } : {}) }}>
                          <ScoreDecorator score={r?.raw ?? null} par={h.par} />
                          {r && r.received > 0 && r.raw != null && (
                            <span style={{ position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)', display: 'block' }} />
                          )}
                        </td>
                      )
                    },
                    player.outGross || '—',
                    player.inGross || '—',
                    <span style={{ color: 'var(--gold)' }}>{player.totalGross || '—'}</span>,
                  )}
                </tr>

                {/* ADJ. SCORE row */}
                <tr>
                  <td style={adjLabelCell}>ADJ.<br />SCORE</td>
                  {renderHoleCells(
                    (h, isFirstIn) => {
                      const r = holeMap.get(h.number)
                      return (
                        <td key={h.number} style={{ ...dataCell, ...(isFirstIn ? { borderLeft: '2px solid var(--border2)' } : {}) }}>
                          <ScoreDecorator score={r?.adjScore ?? null} par={h.par} />
                        </td>
                      )
                    },
                    player.outAdj || '—',
                    player.inAdj || '—',
                    <span style={{ color: 'var(--gold)' }}>{player.totalAdj || '—'}</span>,
                  )}
                </tr>

                {/* PTS row — Stableford only */}
                {isStableford && (
                  <tr>
                    <td style={ptsLabelCell}>PTS</td>
                    {renderHoleCells(
                      (h, isFirstIn) => {
                        const r = holeMap.get(h.number)
                        const pts = r?.pts ?? null
                        return (
                          <td key={h.number} style={{ ...dataCell, color: pts != null && pts > 0 ? 'var(--gold)' : 'var(--text-dim)', fontWeight: pts != null && pts > 0 ? 600 : 400, ...(isFirstIn ? { borderLeft: '2px solid var(--border2)' } : {}) }}>
                            {pts ?? '—'}
                          </td>
                        )
                      },
                      <span style={{ color: 'var(--gold)' }}>{player.outPts}</span>,
                      <span style={{ color: 'var(--gold)' }}>{player.inPts}</span>,
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{player.totalPts}</span>,
                    )}
                  </tr>
                )}

              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
