/**
 * Generates and opens a print-ready HTML page for tournament group pairings.
 */

interface PrintGroup {
  num: number
  time: string
  chaperones: string[]
  players: { name: string; grade: string }[]
}

interface PrintSheetData {
  tournamentName: string
  tournamentDate: string
  courseName: string
  tournamentNotes: string
  logoUrl: string | null
  groupCount: number
  playerCount: number
  pairingsUrl: string
  groups: PrintGroup[]
}

function getInitials(name: string): string {
  const parts = name.replace(/[().]/g, '').split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildCardHtml(group: PrintGroup): string {
  const playersHtml = group.players.map(p => `
    <div class="player">
      <div class="initials">${escapeHtml(getInitials(p.name))}</div>
      <div class="player-name">${escapeHtml(p.name)}</div>
      ${p.grade ? `<div class="player-grade">Grade ${escapeHtml(p.grade)}</div>` : ''}
    </div>
  `).join('')

  const chapLine = group.chaperones.length > 0
    ? `<div class="chaperone">
        <span class="chap-label">Chaperone</span>
        <span class="chap-name">${escapeHtml(group.chaperones.join(', '))}</span>
      </div>`
    : ''

  return `
    <div class="card">
      <div class="card-header">
        <div class="group-name">Group ${group.num}</div>
        <div class="badges">
          ${group.time ? `<span class="badge-time">${escapeHtml(group.time)}</span>` : ''}
        </div>
      </div>
      ${chapLine}
      <div class="players">${playersHtml}</div>
    </div>
  `
}

const CSS = `
  :root {
    --forest: #1B2E1B;
    --forest-dark: #121F12;
    --gold: #C9A84C;
    --gold-dim: #A08838;
    --cream: #F0EAD6;
    --card-border: #D8D0C0;
    --card-bg: #FAFAF7;
    --muted: #8A9080;
    --text-dark: #2A2A28;
    --text-mid: #5A5A55;
    --text-light: #8A8A82;
    --row-alt: #F7F6F2;
    --white: #FFFFFF;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  @page { size: letter; margin: 0; }

  body {
    font-family: 'DM Sans', -apple-system, sans-serif;
    background: var(--white);
    color: var(--text-dark);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header {
    background: var(--forest-dark);
    padding: 20px 36px 16px;
    border-bottom: 2px solid var(--gold);
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
  }

  .brand {
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 2.5px;
    color: var(--muted);
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .logo-img {
    width: 48px;
    height: 48px;
    border-radius: 6px;
    object-fit: cover;
  }

  .title {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: 24px;
    color: var(--cream);
    line-height: 1.15;
    margin-bottom: 4px;
  }

  .subtitle {
    font-weight: 600;
    font-size: 13px;
    color: var(--gold);
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    color: #B0BAA8;
    flex-wrap: wrap;
  }

  .info-row .sep { color: #4A5A44; font-size: 8px; }
  .info-row .stat { color: var(--gold); font-weight: 600; }

  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    font-size: 8px;
  }

  .meta-row .format { color: #7A8A70; }
  .meta-row .link { color: var(--gold-dim); text-decoration: none; }

  .body { background: var(--white); padding: 14px 30px 10px; }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .card {
    border: 1px solid var(--card-border);
    border-radius: 8px;
    background: var(--card-bg);
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    border-bottom: 1px solid #E8E4DC;
  }

  .group-name {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: 14px;
    color: var(--forest);
  }

  .badge-time {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 9.5px;
    font-weight: 600;
    background: var(--forest);
    color: var(--gold);
    border: 1px solid var(--forest);
  }

  .chaperone {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    background: var(--forest);
    border-bottom: 1px solid #E8E4DC;
  }

  .chap-label {
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--gold);
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .chap-name {
    font-size: 9.5px;
    font-weight: 700;
    color: #FFFFFF;
  }

  .players { padding: 2px 0; }

  .player {
    display: flex;
    align-items: center;
    padding: 3px 12px;
    gap: 8px;
  }

  .player:nth-child(even) { background: var(--row-alt); }

  .initials {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--forest);
    color: var(--gold);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 6.5px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .player-name {
    font-size: 9.5px;
    font-weight: 700;
    color: var(--text-dark);
    flex: 1;
  }

  .player-grade {
    font-size: 8px;
    color: var(--text-light);
    flex-shrink: 0;
  }

  .footer {
    padding: 8px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #D8D0C0;
    font-size: 7.5px;
    color: var(--text-light);
    background: var(--white);
    position: relative;
  }

  .footer .powered-by {
    display: flex;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    color: var(--text-light);
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .footer .powered-by span {
    font-size: 7px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .page-header-cont {
    background: var(--forest-dark);
    padding: 10px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--gold);
  }

  .page-header-cont .cont-title {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    font-size: 14px;
    color: var(--cream);
  }

  .page-header-cont .cont-sub {
    font-size: 9px;
    color: var(--muted);
    margin-left: 8px;
  }

  .page-header-cont .cont-right {
    font-size: 8px;
    color: var(--muted);
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .no-print { display: none !important; }
  }

  .page {
    width: 8.5in;
    min-height: 11in;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    background: var(--white);
  }

  .print-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 28px;
    background: #C9A84C;
    color: #121F12;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 100;
  }
`

function buildPageHtml(
  data: PrintSheetData,
  pageIndex: number,
  totalPages: number,
  cardsHtml: string,
): string {
  if (pageIndex === 0) {
    const logoImg = data.logoUrl
      ? `<img class="logo-img" src="${escapeHtml(data.logoUrl)}" alt="Logo">`
      : ''
    const pairingsShort = data.pairingsUrl.replace(/^https?:\/\//, '')

    return `
    <div class="page">
      <div class="header">
        <div class="header-top">
          <div>
            <div class="brand">Lotus AI</div>
            <div class="title">${escapeHtml(data.tournamentName)}</div>
            <div class="subtitle">Group Pairings</div>
          </div>
          ${logoImg}
        </div>
        <div class="info-row">
          <span>${escapeHtml(data.tournamentDate)}</span>
          <span class="sep">|</span>
          <span>${escapeHtml(data.courseName)}</span>
          <span class="sep">|</span>
          <span class="stat">${data.groupCount} groups &middot; ${data.playerCount} players</span>
        </div>
        <div class="meta-row">
          <span class="format">${escapeHtml(data.tournamentNotes)}</span>
          ${data.pairingsUrl ? `<a class="link" href="${escapeHtml(data.pairingsUrl)}">${escapeHtml(pairingsShort)}</a>` : ''}
        </div>
      </div>
      <div class="body" style="flex:1;">
        <div class="grid">${cardsHtml}</div>
      </div>
      <div class="footer">
        <span>${escapeHtml(data.tournamentName)} &mdash; Group Pairings</span>
        <a class="powered-by" href="https://getlotusai.com">
          <span>Powered by Lotus AI</span>
        </a>
        <span>Page 1 of ${totalPages}</span>
      </div>
    </div>`
  }

  return `
    <div class="page">
      <div class="page-header-cont">
        <div><span class="cont-title">Group Pairings</span><span class="cont-sub">(continued)</span></div>
        <span class="cont-right">${escapeHtml(data.tournamentName)}</span>
      </div>
      <div class="body" style="flex:1;">
        <div class="grid">${cardsHtml}</div>
      </div>
      <div class="footer">
        <span>${escapeHtml(data.tournamentName)} &mdash; Group Pairings</span>
        <a class="powered-by" href="https://getlotusai.com">
          <span>Powered by Lotus AI</span>
        </a>
        <span>Page ${pageIndex + 1} of ${totalPages}</span>
      </div>
    </div>`
}

export function openPrintSheet(data: PrintSheetData): void {
  const GROUPS_PER_PAGE = 6
  const totalPages = Math.max(1, Math.ceil(data.groups.length / GROUPS_PER_PAGE))

  let pagesHtml = ''
  for (let page = 0; page < totalPages; page++) {
    const pageGroups = data.groups.slice(page * GROUPS_PER_PAGE, (page + 1) * GROUPS_PER_PAGE)
    const cardsHtml = pageGroups.map(buildCardHtml).join('')
    pagesHtml += buildPageHtml(data, page, totalPages, cardsHtml)
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.tournamentName)} — Group Pairings</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
  ${pagesHtml}
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(fullHtml)
  win.document.close()
}
