'use client'

interface HoleInfo {
  number: number
  par: number
  strokeIndex: number | null
}

interface PlayerRow {
  holeNumber: number
  raw: number | null
  net: number | null
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
  outNet: number
  inNet: number
  totalNet: number
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

function netScoreStyle(net: number | null, par: number): React.CSSProperties {
  if (net == null) return {}
  const diff = net - par
  if (diff <= -2) return { background: '#2d6a2d' }
  if (diff === -1) return { background: '#3a8a3a' }
  if (diff === 0) return {}
  if (diff === 1) return { background: 'rgba(212,160,23,0.2)' }
  return { background: 'rgba(0,0,0,0.2)' }
}

function rawScoreStyle(raw: number | null, par: number): React.CSSProperties {
  if (raw == null) return { opacity: 0.55 }
  const diff = raw - par
  if (diff <= -2) return { background: 'rgba(45,106,45,0.35)', opacity: 0.55 }
  if (diff === -1) return { background: 'rgba(58,138,58,0.35)', opacity: 0.55 }
  if (diff === 0) return { opacity: 0.55 }
  if (diff === 1) return { background: 'rgba(212,160,23,0.1)', opacity: 0.55 }
  return { background: 'rgba(0,0,0,0.1)', opacity: 0.55 }
}

const cellBase: React.CSSProperties = {
  padding: '5px 6px',
  textAlign: 'center',
  fontSize: '0.8rem',
  fontFamily: 'var(--fm)',
  position: 'relative',
  minWidth: 36,
  borderRight: '1px solid var(--border)',
}

const headerCell: React.CSSProperties = {
  ...cellBase,
  color: 'var(--text-muted)',
  fontWeight: 600,
  background: 'var(--forest)',
  borderBottom: '1px solid var(--border2)',
}

const subHeaderCell: React.CSSProperties = {
  ...cellBase,
  color: 'var(--text-dim)',
  fontSize: '0.7rem',
  background: 'var(--surface2)',
  borderBottom: '1px solid var(--border)',
}

const subtotalCell: React.CSSProperties = {
  ...cellBase,
  background: 'var(--surface2)',
  fontWeight: 600,
}

const stickyNameCell: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  background: 'var(--surface)',
  minWidth: 110,
  maxWidth: 130,
  padding: '5px 8px',
  fontSize: '0.8rem',
  fontFamily: 'var(--fb)',
  color: 'var(--text)',
  borderRight: '1px solid var(--border2)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const stickyNameHeader: React.CSSProperties = {
  ...stickyNameCell,
  background: 'var(--forest)',
  color: 'var(--text-muted)',
  fontFamily: 'var(--fm)',
  fontWeight: 600,
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderBottom: '1px solid var(--border2)',
}

export default function ScorecardTable({ holes, players, format, holeCount }: Props) {
  const isStableford = format === 'Stableford'
  const midpoint = Math.floor(holeCount / 2)
  const outHoles = holes.filter(h => h.number <= midpoint)
  const inHoles = holes.filter(h => h.number > midpoint)
  const showInOut = midpoint > 0 && inHoles.length > 0

  const outPar = outHoles.reduce((s, h) => s + h.par, 0)
  const inPar = inHoles.reduce((s, h) => s + h.par, 0)
  const totalPar = outPar + inPar

  // Flatten hole order: out holes, then in holes
  const orderedHoles = [...outHoles, ...inHoles]

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table
        className="sc-table"
        style={{
          borderCollapse: 'collapse',
          minWidth: '100%',
          tableLayout: 'fixed',
          width: 'max-content',
        }}
      >
        <thead>
          {/* Row 1: HOLE numbers */}
          <tr>
            <th style={{ ...stickyNameHeader, zIndex: 3 }}>Player</th>
            <th style={{ ...headerCell, color: 'var(--text-dim)', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Row</th>
            {outHoles.map(h => (
              <th key={h.number} style={headerCell}>{h.number}</th>
            ))}
            {showInOut && <th style={{ ...headerCell, color: 'var(--gold)', minWidth: 40 }}>OUT</th>}
            {inHoles.map(h => (
              <th key={h.number} style={headerCell}>{h.number}</th>
            ))}
            {showInOut && <th style={{ ...headerCell, color: 'var(--gold)', minWidth: 40 }}>IN</th>}
            <th style={{ ...headerCell, color: 'var(--gold)', minWidth: 44 }}>TOT</th>
          </tr>

          {/* Row 2: PAR */}
          <tr>
            <th style={{ ...stickyNameHeader, zIndex: 3, background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>PAR</th>
            <th style={{ ...subHeaderCell, fontSize: '0.65rem', letterSpacing: '0.08em' }}>—</th>
            {outHoles.map(h => (
              <td key={h.number} style={subHeaderCell}>{h.par}</td>
            ))}
            {showInOut && <td style={{ ...subtotalCell, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{outPar}</td>}
            {inHoles.map(h => (
              <td key={h.number} style={subHeaderCell}>{h.par}</td>
            ))}
            {showInOut && <td style={{ ...subtotalCell, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inPar}</td>}
            <td style={{ ...subtotalCell, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{totalPar}</td>
          </tr>

          {/* Row 3: SI (Stroke Index) */}
          <tr>
            <th style={{ ...stickyNameHeader, zIndex: 3, background: 'var(--surface2)', fontSize: '0.65rem' }}>SI</th>
            <th style={{ ...subHeaderCell, fontSize: '0.65rem' }}>—</th>
            {outHoles.map(h => (
              <td key={h.number} style={{ ...subHeaderCell, color: 'var(--text-dim)' }}>
                {h.strokeIndex ?? '—'}
              </td>
            ))}
            {showInOut && <td style={subHeaderCell}>—</td>}
            {inHoles.map(h => (
              <td key={h.number} style={{ ...subHeaderCell, color: 'var(--text-dim)' }}>
                {h.strokeIndex ?? '—'}
              </td>
            ))}
            {showInOut && <td style={subHeaderCell}>—</td>}
            <td style={subHeaderCell}>—</td>
          </tr>
        </thead>

        <tbody>
          {players.map((player, pi) => {
            const holeMap = new Map(player.rows.map(r => [r.holeNumber, r]))
            const rowCount = isStableford ? (player.hasHandicap ? 3 : 2) : (player.hasHandicap ? 2 : 1)
            const rowBorderTop = pi > 0 ? '2px solid var(--border2)' : '1px solid var(--border)'

            // Net row
            const netRow = (
              <tr key={`${player.id}-net`}>
                <td
                  rowSpan={rowCount}
                  style={{
                    ...stickyNameCell,
                    borderTop: rowBorderTop,
                    verticalAlign: 'middle',
                    fontWeight: 600,
                    zIndex: 2,
                  }}
                  title={player.name}
                >
                  {player.name}
                  {player.hasHandicap && (
                    <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--fm)', fontWeight: 400 }}>
                      HCP {player.courseHandicap}
                    </span>
                  )}
                </td>
                <td style={{ ...cellBase, fontSize: '0.65rem', color: 'var(--text-dim)', borderTop: rowBorderTop }}>
                  {player.hasHandicap ? 'NET' : 'GRS'}
                </td>
                {orderedHoles.map((h, hi) => {
                  const isOut = h.number <= midpoint
                  const isFirstIn = !isOut && hi > 0 && orderedHoles[hi - 1].number <= midpoint
                  const r = holeMap.get(h.number)
                  const displayVal = player.hasHandicap ? r?.net : r?.raw
                  const parForStyle = player.hasHandicap ? h.par : h.par
                  const style: React.CSSProperties = {
                    ...cellBase,
                    ...netScoreStyle(displayVal ?? null, parForStyle),
                    borderTop: rowBorderTop,
                    ...(isFirstIn && showInOut ? { borderLeft: '2px solid var(--border2)' } : {}),
                  }
                  return (
                    <td key={h.number} style={style}>
                      {displayVal != null ? displayVal : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                      {r && r.received > 0 && displayVal != null && (
                        <span style={{ position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block' }} />
                      )}
                      {/* OUT subtotal placeholder for this row's column */}
                    </td>
                  )
                }).reduce<React.ReactNode[]>((acc, cell, idx) => {
                  acc.push(cell)
                  // Insert OUT subtotal after out holes
                  if (showInOut && outHoles.length > 0 && idx === outHoles.length - 1) {
                    acc.push(
                      <td key="out" style={{ ...subtotalCell, borderTop: rowBorderTop }}>
                        {player.hasHandicap ? player.outNet : player.outGross}
                      </td>
                    )
                  }
                  // Insert IN subtotal after in holes
                  if (showInOut && idx === outHoles.length + inHoles.length - 1) {
                    acc.push(
                      <td key="in" style={{ ...subtotalCell, borderTop: rowBorderTop }}>
                        {player.hasHandicap ? player.inNet : player.inGross}
                      </td>
                    )
                  }
                  return acc
                }, [])}
                <td style={{ ...subtotalCell, borderTop: rowBorderTop, color: 'var(--gold)', fontWeight: 700 }}>
                  {player.hasHandicap ? player.totalNet : player.totalGross}
                </td>
              </tr>
            )

            // Raw row (only when hasHandicap)
            const rawRow = player.hasHandicap ? (
              <tr key={`${player.id}-raw`}>
                <td style={{ ...cellBase, fontSize: '0.65rem', color: 'var(--text-dim)' }}>GRS</td>
                {orderedHoles.map((h, hi) => {
                  const isFirstIn = h.number > midpoint && hi > 0 && orderedHoles[hi - 1].number <= midpoint
                  const r = holeMap.get(h.number)
                  const style: React.CSSProperties = {
                    ...cellBase,
                    ...rawScoreStyle(r?.raw ?? null, h.par),
                    ...(isFirstIn && showInOut ? { borderLeft: '2px solid var(--border2)' } : {}),
                  }
                  return (
                    <td key={h.number} style={style}>
                      {r?.raw != null ? r.raw : <span style={{ color: 'var(--text-dim)', opacity: 0.55 }}>—</span>}
                    </td>
                  )
                }).reduce<React.ReactNode[]>((acc, cell, idx) => {
                  acc.push(cell)
                  if (showInOut && outHoles.length > 0 && idx === outHoles.length - 1) {
                    acc.push(<td key="out" style={{ ...subtotalCell, opacity: 0.55 }}>{player.outGross}</td>)
                  }
                  if (showInOut && idx === outHoles.length + inHoles.length - 1) {
                    acc.push(<td key="in" style={{ ...subtotalCell, opacity: 0.55 }}>{player.inGross}</td>)
                  }
                  return acc
                }, [])}
                <td style={{ ...subtotalCell, opacity: 0.55 }}>{player.totalGross}</td>
              </tr>
            ) : null

            // Pts row (only when Stableford)
            const ptsRow = isStableford ? (
              <tr key={`${player.id}-pts`}>
                <td style={{ ...cellBase, fontSize: '0.65rem', color: 'var(--gold)', fontWeight: 600 }}>PTS</td>
                {orderedHoles.map((h, hi) => {
                  const isFirstIn = h.number > midpoint && hi > 0 && orderedHoles[hi - 1].number <= midpoint
                  const r = holeMap.get(h.number)
                  const pts = r?.pts ?? null
                  const style: React.CSSProperties = {
                    ...cellBase,
                    color: pts != null && pts > 0 ? 'var(--gold)' : 'var(--text-dim)',
                    fontWeight: pts != null && pts > 0 ? 600 : 400,
                    ...(isFirstIn && showInOut ? { borderLeft: '2px solid var(--border2)' } : {}),
                  }
                  return (
                    <td key={h.number} style={style}>
                      {pts != null ? pts : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>
                  )
                }).reduce<React.ReactNode[]>((acc, cell, idx) => {
                  acc.push(cell)
                  if (showInOut && outHoles.length > 0 && idx === outHoles.length - 1) {
                    acc.push(<td key="out" style={{ ...subtotalCell, color: 'var(--gold)' }}>{player.outPts}</td>)
                  }
                  if (showInOut && idx === outHoles.length + inHoles.length - 1) {
                    acc.push(<td key="in" style={{ ...subtotalCell, color: 'var(--gold)' }}>{player.inPts}</td>)
                  }
                  return acc
                }, [])}
                <td style={{ ...subtotalCell, color: 'var(--gold)', fontWeight: 700 }}>{player.totalPts}</td>
              </tr>
            ) : null

            return [netRow, rawRow, ptsRow]
          })}
        </tbody>
      </table>
    </div>
  )
}
