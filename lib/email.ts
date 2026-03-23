import { Resend } from 'resend'
import { getBaseUrl } from '@/lib/url'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'Lotus Links <hello@getlotusai.com>'

// ─── League Admin Invite Email ─────────────────────────────────────────────────

interface LeagueAdminInviteEmailPayload {
  to: string
  leagueName: string
  invitedByEmail: string
}

export async function sendLeagueAdminInviteEmail(payload: LeagueAdminInviteEmailPayload) {
  const html = buildLeagueAdminInviteEmailHtml(payload)

  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: payload.to,
    subject: `You've been invited to manage ${payload.leagueName} on Lotus Links`,
    html,
  })

  if (error) throw new Error(error.message)
}

function buildLeagueAdminInviteEmailHtml(data: LeagueAdminInviteEmailPayload) {
  const { leagueName, invitedByEmail } = data
  const loginUrl = `${getBaseUrl()}/login`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Syne:wght@700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#1a2e1a;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a2e1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#243324;border:1px solid #3a5c3a;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#162416 0%,#1e3a1e 50%,#1a3020 100%);padding:32px 24px 28px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;color:#b8976a;text-transform:uppercase;font-weight:600;margin-bottom:14px;font-family:Georgia,serif;">Lotus Links</div>
          <div style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#f0ece4;margin-bottom:6px;line-height:1.2;">You're Invited</div>
          <div style="font-size:13px;color:#8aad8a;">League Admin Access</div>
        </td></tr>

        <!-- Gold divider -->
        <tr><td style="padding:0;height:2px;background:linear-gradient(90deg,transparent,#b8976a 30%,#d4af7a 50%,#b8976a 70%,transparent);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 24px 20px;">
          <div style="font-family:Georgia,serif;font-size:18px;color:#f0ece4;margin-bottom:6px;">Hello,</div>
          <div style="font-size:14px;color:rgba(240,236,228,0.65);margin-bottom:24px;line-height:1.65;">
            <strong style="color:#f0ece4;">${invitedByEmail}</strong> has invited you to help manage
            <strong style="color:#b8976a;">${leagueName}</strong> on Lotus Links.
            Sign in with Google to access the league dashboard.
          </div>

          <!-- League card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e2d1e;border:1px solid #3a5c3a;border-radius:8px;margin-bottom:24px;overflow:hidden;">
            <tr><td style="background:#162416;padding:12px 16px;">
              <div style="font-size:10px;letter-spacing:2.5px;color:rgba(138,173,138,0.6);text-transform:uppercase;margin-bottom:4px;font-family:Georgia,serif;">League</div>
              <div style="font-family:Georgia,serif;font-size:16px;color:#b8976a;font-weight:600;">${leagueName}</div>
            </td></tr>
            <tr><td style="padding:12px 16px;">
              <div style="font-size:13px;color:rgba(240,236,228,0.65);font-family:Georgia,serif;">
                Role: <strong style="color:#f0ece4;">Admin</strong>
              </div>
            </td></tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td align="center">
              <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8976a,#c9a87a,#b8976a);color:#1a2e1a;font-family:Georgia,serif;font-size:13px;font-weight:700;padding:15px 40px;border-radius:8px;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">
                Accept Invite &rarr;
              </a>
            </td></tr>
          </table>

          <div style="font-size:12px;color:rgba(138,173,138,0.55);line-height:1.6;text-align:center;">
            Sign in with the Google account associated with this email address.
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#162416;padding:16px 24px;text-align:center;border-top:1px solid #2d482d;">
          <a href="https://getlotusai.com" style="display:inline-block;text-decoration:none;font-size:0;">
            <img src="https://links.getlotusai.com/lotus-logo.png" alt="Lotus AI" height="18" style="display:inline-block;vertical-align:middle;width:auto;border-radius:3px;" /><span style="display:inline-block;vertical-align:middle;margin-left:8px;font-size:11px;letter-spacing:3px;color:#6b7b6b;text-transform:uppercase;font-weight:700;font-family:'Syne',Georgia,sans-serif;">Powered by Lotus AI</span>
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Scoring Link Email ────────────────────────────────────────────────────────

interface ScoringLinkEmailPayload {
  to: string
  groupName: string
  chaperoneName: string | null
  players: string[]
  startingHole: number
  teeTime: string | null
  scoringUrl: string
  tournamentName: string
  courseName: string
  tournamentDate: string
}

export async function sendScoringLinkEmail(payload: ScoringLinkEmailPayload) {
  const { to, ...rest } = payload
  const html = buildScoringEmailHtml(rest)

  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your Scoring Link — ${payload.groupName} | ${payload.tournamentName}`,
    html,
  })

  if (error) throw new Error(error.message)
}

interface PlayerScoringEmailPayload {
  to: string
  playerName: string | null
  groupName: string
  players: string[]
  scoringUrl: string
  tournamentName: string
  courseName: string
  tournamentDate: string
}

export async function sendPlayerScoringEmail(payload: PlayerScoringEmailPayload) {
  const { to, ...rest } = payload
  const html = buildPlayerScoringEmailHtml(rest)

  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your Scoring Link — ${payload.tournamentName}`,
    html,
  })

  if (error) throw new Error(error.message)
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/** Format a DB time string like "13:30:00" → "1:30 PM" */
function formatTeeTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

function fmtNetVsPar(n: number): string {
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

function buildGhinTableHtml(
  holes: { number: number; par: number; raw: number; adjScore: number; received: number; strokeIndex: number | null; yardage: number | null }[]
): string {
  const n = holes.length
  const isFullRound = n >= 18
  const splitIdx = isFullRound ? Math.floor(n / 2) : n
  const sections: Array<{ holes: typeof holes; label: string }> = [
    { holes: holes.slice(0, splitIdx), label: isFullRound ? 'OUT' : 'TOTAL' },
  ]
  if (isFullRound) sections.push({ holes: holes.slice(splitIdx), label: 'IN' })

  // Header cell: dark navy bg, bold
  const hdrBg = '#0d3d1a'
  const totBg = 'background:#111d11;'

  // Score cell with GHIN-style decorators
  function scoreDecorator(score: number, par: number): string {
    if (!score) return `<td style="padding:4px 3px;text-align:center;font-size:11px;color:rgba(240,236,228,0.3);font-family:Georgia,serif;">—</td>`
    const rel = score - par
    const gold = '#c9a84c'
    const txt = `font-size:11px;font-weight:600;color:${gold};font-family:Georgia,serif;line-height:1;`
    if (rel <= -2) {
      // Eagle or better: double circle
      return `<td style="padding:3px 2px;text-align:center;"><span style="display:inline-block;border:1px solid ${gold};border-radius:50%;padding:3px;line-height:0;"><span style="display:inline-block;border:1px solid ${gold};border-radius:50%;width:16px;height:16px;line-height:16px;text-align:center;${txt}">${score}</span></span></td>`
    } else if (rel === -1) {
      // Birdie: single circle
      return `<td style="padding:3px 2px;text-align:center;"><span style="display:inline-block;border:1.5px solid ${gold};border-radius:50%;width:20px;height:20px;line-height:20px;text-align:center;${txt}">${score}</span></td>`
    } else if (rel === 0) {
      // Par: muted green, no border
      return `<td style="padding:4px 3px;text-align:center;font-size:11px;color:rgba(138,173,138,0.75);font-family:Georgia,serif;">${score}</td>`
    } else if (rel === 1) {
      // Bogey: single square
      return `<td style="padding:3px 2px;text-align:center;"><span style="display:inline-block;border:1.5px solid ${gold};width:20px;height:20px;line-height:20px;text-align:center;${txt}">${score}</span></td>`
    } else {
      // Double bogey+: double square
      return `<td style="padding:3px 2px;text-align:center;"><span style="display:inline-block;border:1px solid ${gold};padding:2px;line-height:0;"><span style="display:inline-block;border:1px solid ${gold};width:14px;height:14px;line-height:14px;text-align:center;${txt}">${score}</span></span></td>`
    }
  }

  const tables = sections.map(({ holes: sh, label }) => {
    const sumYards = sh.reduce((s, h) => s + (h.yardage || 0), 0)
    const sumPar = sh.reduce((s, h) => s + h.par, 0)
    const sumGross = sh.reduce((s, h) => s + (h.raw || 0), 0)
    const sumAdj = sh.reduce((s, h) => s + (h.adjScore || 0), 0)

    const holeRow = `<tr style="background:${hdrBg};"><td style="padding:5px 6px 5px 8px;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#8aad8a;font-family:Georgia,serif;font-weight:700;white-space:nowrap;border-right:1px solid #1f5a2f;">HOLE</td>${sh.map(h => `<td style="padding:5px 3px;text-align:center;font-size:11px;color:#c9a84c;font-family:Georgia,serif;font-weight:700;border-right:1px solid #1f5a2f;">${h.number}</td>`).join('')}<td style="padding:5px 6px;text-align:center;font-size:9px;letter-spacing:1.5px;font-weight:700;color:#8aad8a;font-family:Georgia,serif;${totBg}">${label}</td></tr>`

    const yardsRow = `<tr style="border-bottom:1px solid #2d482d;"><td style="padding:4px 6px 4px 8px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(138,173,138,0.5);font-family:Georgia,serif;white-space:nowrap;background:#162416;border-right:1px solid #2d482d;">YARDS</td>${sh.map(h => `<td style="padding:4px 3px;text-align:center;font-size:11px;color:rgba(240,236,228,0.3);font-family:Georgia,serif;">${h.yardage || '—'}</td>`).join('')}<td style="padding:4px 6px;text-align:center;font-size:11px;color:rgba(240,236,228,0.3);font-family:Georgia,serif;${totBg}">${sumYards || '—'}</td></tr>`

    const parRow = `<tr style="background:rgba(13,61,26,0.3);border-bottom:1px solid #2d482d;"><td style="padding:4px 6px 4px 8px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(138,173,138,0.5);font-family:Georgia,serif;white-space:nowrap;background:#162416;border-right:1px solid #2d482d;">PAR</td>${sh.map(h => `<td style="padding:4px 3px;text-align:center;font-size:11px;color:rgba(138,173,138,0.75);font-family:Georgia,serif;">${h.par}</td>`).join('')}<td style="padding:4px 6px;text-align:center;font-size:11px;color:rgba(138,173,138,0.75);font-weight:700;font-family:Georgia,serif;${totBg}">${sumPar}</td></tr>`

    const siRow = `<tr style="border-bottom:1px solid #2d482d;"><td style="padding:4px 6px 4px 8px;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:rgba(138,173,138,0.35);font-family:Georgia,serif;white-space:nowrap;background:#162416;border-right:1px solid #2d482d;line-height:1.3;">STROKE<br>INDEX</td>${sh.map(h => `<td style="padding:4px 3px;text-align:center;font-size:10px;color:rgba(240,236,228,0.25);font-family:Georgia,serif;">${h.strokeIndex ?? '—'}</td>`).join('')}<td style="padding:4px 6px;text-align:center;font-size:10px;color:rgba(240,236,228,0.2);font-family:Georgia,serif;${totBg}">—</td></tr>`

    const scoreRow = `<tr style="border-bottom:1px solid #2d482d;"><td style="padding:4px 6px 4px 8px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(138,173,138,0.5);font-family:Georgia,serif;white-space:nowrap;background:#162416;border-right:1px solid #2d482d;">SCORE</td>${sh.map(h => scoreDecorator(h.raw, h.par)).join('')}<td style="padding:4px 6px;text-align:center;font-size:12px;color:#f0ece4;font-weight:700;font-family:Georgia,serif;${totBg}">${sumGross || '—'}</td></tr>`

    const adjRow = `<tr><td style="padding:4px 6px 4px 8px;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:rgba(138,173,138,0.5);font-family:Georgia,serif;white-space:nowrap;background:#162416;border-right:1px solid #2d482d;line-height:1.3;">ADJ.<br>SCORE</td>${sh.map(h => scoreDecorator(h.adjScore, h.par)).join('')}<td style="padding:4px 6px;text-align:center;font-size:11px;color:rgba(240,236,228,0.65);font-family:Georgia,serif;${totBg}">${sumAdj || '—'}</td></tr>`

    return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:8px;border:1px solid #2d482d;border-radius:4px;overflow:hidden;font-size:11px;">${holeRow}${yardsRow}${parRow}${siRow}${scoreRow}${adjRow}</table>`
  })

  // If split into OUT+IN, append a TOTAL summary row
  if (isFullRound) {
    const totGross = holes.reduce((s, h) => s + (h.raw || 0), 0)
    const totAdj = holes.reduce((s, h) => s + (h.adjScore || 0), 0)
    tables.push(`<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #2d482d;border-radius:4px;overflow:hidden;"><tr style="background:#162416;"><td style="padding:5px 6px 5px 8px;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(138,173,138,0.5);font-family:Georgia,serif;white-space:nowrap;border-right:1px solid #2d482d;">TOTAL</td><td colspan="2" style="padding:5px 8px;text-align:right;font-size:10px;color:rgba(138,173,138,0.5);font-family:Georgia,serif;">Gross</td><td style="padding:5px 8px;text-align:center;font-size:12px;color:#f0ece4;font-weight:700;font-family:Georgia,serif;">${totGross}</td><td style="padding:5px 8px;text-align:right;font-size:10px;color:rgba(138,173,138,0.5);font-family:Georgia,serif;">Adj.</td><td style="padding:5px 8px;text-align:center;font-size:11px;color:rgba(240,236,228,0.65);font-family:Georgia,serif;">${totAdj}</td></tr></table>`)
  }

  return tables.join('')
}

function buildPlayerScoringEmailHtml(data: Omit<PlayerScoringEmailPayload, 'to'>) {
  const { playerName, groupName, players, scoringUrl, tournamentName, courseName, tournamentDate } = data

  const recipientName = (playerName ?? '').trim()

  const playerRows = players
    .map((name, idx) => {
      const isRecipient = name.trim() === recipientName && recipientName !== ''
      const initials = getInitials(name)
      const avatarBg = isRecipient ? 'linear-gradient(135deg,#b8976a,#d4af7a)' : '#2d4a2d'
      const avatarBorder = isRecipient ? '2px solid #b8976a' : '2px solid #3a5c3a'
      const avatarColor = isRecipient ? '#1a2e1a' : '#8aad8a'
      const nameColor = isRecipient ? '#b8976a' : '#f0ece4'
      const rowBorder = idx < players.length - 1 ? 'border-bottom:1px solid #2d482d;' : ''
      const youBadge = isRecipient
        ? `<td align="right" style="padding:10px 16px 10px 0;vertical-align:middle;"><span style="display:inline-block;background:rgba(184,151,106,0.15);border:1px solid rgba(184,151,106,0.35);color:#b8976a;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;padding:2px 8px;border-radius:10px;font-family:Georgia,serif;font-weight:600;">You</span></td>`
        : `<td></td>`
      return `<tr style="${rowBorder}">
        <td width="44" style="padding:10px 0 10px 16px;vertical-align:middle;">
          <div style="width:30px;height:30px;border-radius:50%;background:${avatarBg};border:${avatarBorder};text-align:center;line-height:30px;font-size:11px;font-weight:700;color:${avatarColor};font-family:Georgia,serif;">${initials}</div>
        </td>
        <td style="padding:10px 0;font-size:14px;color:${nameColor};font-family:Georgia,serif;vertical-align:middle;">${name}</td>
        ${youBadge}
      </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Syne:wght@700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#1a2e1a;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a2e1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#243324;border:1px solid #3a5c3a;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#162416 0%,#1e3a1e 50%,#1a3020 100%);padding:32px 24px 28px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;color:#b8976a;text-transform:uppercase;font-weight:600;margin-bottom:14px;font-family:Georgia,serif;">Lotus Links</div>
          <div style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#f0ece4;margin-bottom:6px;line-height:1.2;">${tournamentName}</div>
          <div style="font-size:13px;color:#8aad8a;">${courseName} &middot; ${tournamentDate}</div>
        </td></tr>

        <!-- Gold divider -->
        <tr><td style="padding:0;height:2px;background:linear-gradient(90deg,transparent,#b8976a 30%,#d4af7a 50%,#b8976a 70%,transparent);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 24px 20px;">
          <div style="font-family:Georgia,serif;font-size:18px;color:#f0ece4;margin-bottom:6px;">
            ${playerName ? `Hi ${playerName},` : 'Hello,'}
          </div>
          <div style="font-size:14px;color:rgba(240,236,228,0.65);margin-bottom:24px;line-height:1.65;">
            You&rsquo;re registered for <strong style="color:#b8976a;">${groupName}</strong>.
            Use the link below to enter your scores on tournament day.
          </div>

          <!-- Group card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e2d1e;border:1px solid #3a5c3a;border-radius:8px;margin-bottom:24px;overflow:hidden;">
            <!-- Card header -->
            <tr><td style="background:#162416;padding:12px 16px;border-bottom:1px solid #2d482d;">
              <div style="font-size:10px;letter-spacing:2.5px;color:rgba(138,173,138,0.6);text-transform:uppercase;margin-bottom:4px;font-family:Georgia,serif;">Your Group</div>
              <div style="font-family:Georgia,serif;font-size:16px;color:#b8976a;font-weight:600;">${groupName}</div>
            </td></tr>
            ${
              players.length > 0
                ? `<tr><td style="padding:10px 0 6px;">
                    <div style="font-size:10px;letter-spacing:2.5px;color:rgba(138,173,138,0.6);text-transform:uppercase;padding:0 16px 8px;font-family:Georgia,serif;">Players</div>
                    <table width="100%" cellpadding="0" cellspacing="0">${playerRows}</table>
                  </td></tr>`
                : ''
            }
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td align="center">
              <a href="${scoringUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8976a,#c9a87a,#b8976a);color:#1a2e1a;font-family:Georgia,serif;font-size:13px;font-weight:700;padding:15px 40px;border-radius:8px;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">
                Enter My Scores &rarr;
              </a>
            </td></tr>
          </table>

          <!-- Hint -->
          <div style="font-size:12px;color:rgba(138,173,138,0.55);line-height:1.6;text-align:center;">
            Open on your phone to enter scores hole-by-hole as you play.
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#162416;padding:16px 24px;text-align:center;border-top:1px solid #2d482d;">
          <a href="https://getlotusai.com" style="display:inline-block;text-decoration:none;font-size:0;">
            <img src="https://links.getlotusai.com/lotus-logo.png" alt="Lotus AI" height="18" style="display:inline-block;vertical-align:middle;width:auto;border-radius:3px;" /><span style="display:inline-block;vertical-align:middle;margin-left:8px;font-size:11px;letter-spacing:3px;color:#6b7b6b;text-transform:uppercase;font-weight:700;font-family:'Syne',Georgia,sans-serif;">Powered by Lotus AI</span>
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export interface ScorecardSummaryEmailPayload {
  to: string
  playerName: string | null
  tournamentName: string
  courseName: string
  tournamentDate: string
  scorecardUrl: string
  format: string
  leaderboard: { rank: number; name: string; totalPts: number; gross: number; netVsPar: number; isRecipient: boolean }[]
  recipientSummary: {
    holes: { number: number; par: number; raw: number; net: number; pts: number; received: number; strokeIndex: number | null; adjScore: number; yardage: number | null }[]
    gross: number
    net: number
    totalPts: number
    netVsPar: number
  } | null
}

export async function sendScorecardSummaryEmail(payload: ScorecardSummaryEmailPayload) {
  const { to, ...rest } = payload
  const html = buildScorecardSummaryEmailHtml(rest)

  const { error } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Post-Round Scorecard — ${payload.tournamentName}`,
    html,
  })

  if (error) throw new Error(error.message)
}

function buildScorecardSummaryEmailHtml(data: Omit<ScorecardSummaryEmailPayload, 'to'>) {
  const { playerName, tournamentName, courseName, tournamentDate, scorecardUrl, format, leaderboard, recipientSummary } = data
  const isStrokePlay = format === 'Stroke Play'

  const leaderboardRows = leaderboard
    .map((entry, idx) => {
      const rowBg = entry.isRecipient ? 'background:rgba(184,151,106,0.12);' : ''
      const rankColor = idx === 0 ? '#b8976a' : 'rgba(240,236,228,0.55)'
      const nameColor = entry.isRecipient ? '#b8976a' : '#f0ece4'
      const rowBorder = idx < leaderboard.length - 1 ? 'border-bottom:1px solid #2d482d;' : ''
      const youBadge = entry.isRecipient
        ? `<span style="display:inline-block;background:rgba(184,151,106,0.15);border:1px solid rgba(184,151,106,0.35);color:#b8976a;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;padding:1px 6px;border-radius:8px;font-family:Georgia,serif;margin-left:6px;">You</span>`
        : ''
      const scoreCell = isStrokePlay
        ? `<td style="padding:9px 6px;font-size:13px;color:#b8976a;font-family:Georgia,serif;font-weight:700;text-align:right;">${fmtNetVsPar(entry.netVsPar)}</td>`
        : `<td style="padding:9px 6px;font-size:13px;color:#b8976a;font-family:Georgia,serif;font-weight:700;text-align:right;">${entry.totalPts} pts</td>`
      return `<tr style="${rowBg}${rowBorder}">
        <td style="padding:9px 0 9px 12px;width:28px;font-size:12px;color:${rankColor};font-family:Georgia,serif;font-weight:600;">${entry.rank}</td>
        <td style="padding:9px 6px;font-size:13px;color:${nameColor};font-family:Georgia,serif;">${entry.name}${youBadge}</td>
        ${scoreCell}
        <td style="padding:9px 12px 9px 6px;font-size:12px;color:rgba(240,236,228,0.45);font-family:Georgia,serif;text-align:right;">${entry.gross}</td>
      </tr>`
    })
    .join('')

  const leaderboardScoreHeader = isStrokePlay ? 'Net' : 'Pts'

  let scorecardSection = ''
  if (recipientSummary) {
    const { holes, gross, net, netVsPar } = recipientSummary
    const ghinHtml = buildGhinTableHtml(holes)
    const summaryScore = isStrokePlay
      ? `Net vs Par: <strong style="color:#b8976a;">${fmtNetVsPar(netVsPar)}</strong>`
      : `Total: <strong style="color:#b8976a;">${recipientSummary.totalPts} pts</strong>`

    scorecardSection = `
      <!-- Scorecard detail -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e2d1e;border:1px solid #3a5c3a;border-radius:8px;margin-bottom:24px;overflow:hidden;">
        <tr><td style="background:#162416;padding:10px 14px;border-bottom:1px solid #2d482d;">
          <div style="font-size:10px;letter-spacing:2.5px;color:rgba(138,173,138,0.6);text-transform:uppercase;font-family:Georgia,serif;">Your Scorecard</div>
        </td></tr>
        <tr><td style="padding:12px 10px;">
          ${ghinHtml}
          <div style="font-size:12px;color:rgba(138,173,138,0.65);font-family:Georgia,serif;margin-top:8px;padding-top:8px;border-top:1px solid #2d482d;">
            Gross: <strong style="color:#f0ece4;">${gross}</strong>&nbsp;&nbsp;&middot;&nbsp;&nbsp;Adj: <strong style="color:#f0ece4;">${net}</strong>&nbsp;&nbsp;&middot;&nbsp;&nbsp;${summaryScore}
          </div>
        </td></tr>
      </table>`
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Syne:wght@700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#1a2e1a;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a2e1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#243324;border:1px solid #3a5c3a;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#162416 0%,#1e3a1e 50%,#1a3020 100%);padding:32px 24px 28px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;color:#b8976a;text-transform:uppercase;font-weight:600;margin-bottom:14px;font-family:Georgia,serif;">Lotus Links</div>
          <div style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#f0ece4;margin-bottom:6px;line-height:1.2;">${tournamentName}</div>
          <div style="font-size:13px;color:#8aad8a;">${courseName} &middot; ${tournamentDate}</div>
        </td></tr>

        <!-- Gold divider -->
        <tr><td style="padding:0;height:2px;background:linear-gradient(90deg,transparent,#b8976a 30%,#d4af7a 50%,#b8976a 70%,transparent);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 24px 20px;">
          <div style="font-family:Georgia,serif;font-size:18px;color:#f0ece4;margin-bottom:6px;">
            ${playerName ? `Hi ${playerName},` : 'Hello,'}
          </div>
          <div style="font-size:14px;color:rgba(240,236,228,0.65);margin-bottom:24px;line-height:1.65;">
            Here&rsquo;s your post-round scorecard from <strong style="color:#b8976a;">${tournamentName}</strong>. Great round!
          </div>

          <!-- Leaderboard -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e2d1e;border:1px solid #3a5c3a;border-radius:8px;margin-bottom:24px;overflow:hidden;">
            <tr><td style="background:#162416;padding:10px 14px;border-bottom:1px solid #2d482d;">
              <div style="font-size:10px;letter-spacing:2.5px;color:rgba(138,173,138,0.6);text-transform:uppercase;font-family:Georgia,serif;">Final Leaderboard</div>
            </td></tr>
            <tr><td style="padding:4px 0 6px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr style="border-bottom:1px solid #2d482d;">
                  <td style="padding:6px 0 6px 12px;font-size:9px;letter-spacing:2px;color:rgba(138,173,138,0.5);text-transform:uppercase;font-family:Georgia,serif;">#</td>
                  <td style="padding:6px 6px;font-size:9px;letter-spacing:2px;color:rgba(138,173,138,0.5);text-transform:uppercase;font-family:Georgia,serif;">Player</td>
                  <td style="padding:6px 6px;font-size:9px;letter-spacing:2px;color:rgba(138,173,138,0.5);text-transform:uppercase;font-family:Georgia,serif;text-align:right;">${leaderboardScoreHeader}</td>
                  <td style="padding:6px 12px 6px 6px;font-size:9px;letter-spacing:2px;color:rgba(138,173,138,0.5);text-transform:uppercase;font-family:Georgia,serif;text-align:right;">Total</td>
                </tr>
                ${leaderboardRows}
              </table>
            </td></tr>
          </table>

          ${scorecardSection}

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td align="center">
              <a href="${scorecardUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8976a,#c9a87a,#b8976a);color:#1a2e1a;font-family:Georgia,serif;font-size:13px;font-weight:700;padding:15px 40px;border-radius:8px;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">
                View Full Scorecard &rarr;
              </a>
            </td></tr>
          </table>

          <div style="font-size:12px;color:rgba(138,173,138,0.55);line-height:1.6;text-align:center;">
            Hole-by-hole scores and standings for all players.
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#162416;padding:16px 24px;text-align:center;border-top:1px solid #2d482d;">
          <a href="https://getlotusai.com" style="display:inline-block;text-decoration:none;font-size:0;">
            <img src="https://links.getlotusai.com/lotus-logo.png" alt="Lotus AI" height="18" style="display:inline-block;vertical-align:middle;width:auto;border-radius:3px;" /><span style="display:inline-block;vertical-align:middle;margin-left:8px;font-size:11px;letter-spacing:3px;color:#6b7b6b;text-transform:uppercase;font-weight:700;font-family:'Syne',Georgia,sans-serif;">Powered by Lotus AI</span>
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildScoringEmailHtml(data: Omit<ScoringLinkEmailPayload, 'to'>) {
  const {
    groupName,
    chaperoneName,
    players,
    startingHole,
    teeTime,
    scoringUrl,
    tournamentName,
    courseName,
    tournamentDate,
  } = data

  const playerRows = players
    .map((name, idx) => {
      const initials = getInitials(name)
      const rowBorder = idx < players.length - 1 ? 'border-bottom:1px solid #2d482d;' : ''
      return `<tr style="${rowBorder}">
        <td width="44" style="padding:10px 0 10px 16px;vertical-align:middle;">
          <div style="width:30px;height:30px;border-radius:50%;background:#2d4a2d;border:2px solid #3a5c3a;text-align:center;line-height:30px;font-size:11px;font-weight:700;color:#8aad8a;font-family:Georgia,serif;">${initials}</div>
        </td>
        <td style="padding:10px 0 10px 0;font-size:14px;color:#f0ece4;font-family:Georgia,serif;vertical-align:middle;">${name}</td>
        <td></td>
      </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Syne:wght@700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#1a2e1a;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a2e1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#243324;border:1px solid #3a5c3a;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#162416 0%,#1e3a1e 50%,#1a3020 100%);padding:32px 24px 28px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;color:#b8976a;text-transform:uppercase;font-weight:600;margin-bottom:14px;font-family:Georgia,serif;">Lotus Links</div>
          <div style="font-family:Georgia,serif;font-size:26px;font-weight:600;color:#f0ece4;margin-bottom:6px;line-height:1.2;">${tournamentName}</div>
          <div style="font-size:13px;color:#8aad8a;">${courseName} &middot; ${tournamentDate}</div>
        </td></tr>

        <!-- Gold divider -->
        <tr><td style="padding:0;height:2px;background:linear-gradient(90deg,transparent,#b8976a 30%,#d4af7a 50%,#b8976a 70%,transparent);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 24px 20px;">
          <div style="font-family:Georgia,serif;font-size:18px;color:#f0ece4;margin-bottom:6px;">
            ${chaperoneName ? `Hi ${chaperoneName},` : 'Hello,'}
          </div>
          <div style="font-size:14px;color:rgba(240,236,228,0.65);margin-bottom:24px;line-height:1.65;">
            You&rsquo;ve been assigned as chaperone for <strong style="color:#b8976a;">${groupName}</strong>.
            Use the link below to enter scores on tournament day.
          </div>

          <!-- Group card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e2d1e;border:1px solid #3a5c3a;border-radius:8px;margin-bottom:24px;overflow:hidden;">
            <!-- Card header -->
            <tr><td style="background:#162416;padding:12px 16px;border-bottom:1px solid #2d482d;">
              <div style="font-size:10px;letter-spacing:2.5px;color:rgba(138,173,138,0.6);text-transform:uppercase;margin-bottom:4px;font-family:Georgia,serif;">Your Group</div>
              <div style="font-family:Georgia,serif;font-size:16px;color:#b8976a;font-weight:600;margin-bottom:4px;">${groupName}</div>
              ${teeTime
                ? `<div style="font-size:12px;color:rgba(138,173,138,0.55);">Tee Time: ${formatTeeTime(teeTime)}</div>`
                : `<div style="font-size:12px;color:rgba(138,173,138,0.55);">Starting Hole: ${startingHole}</div>`
              }
            </td></tr>
            ${
              players.length > 0
                ? `<tr><td style="padding:10px 0 6px;">
                    <div style="font-size:10px;letter-spacing:2.5px;color:rgba(138,173,138,0.6);text-transform:uppercase;padding:0 16px 8px;font-family:Georgia,serif;">Players</div>
                    <table width="100%" cellpadding="0" cellspacing="0">${playerRows}</table>
                  </td></tr>`
                : ''
            }
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td align="center">
              <a href="${scoringUrl}" style="display:inline-block;background:linear-gradient(135deg,#b8976a,#c9a87a,#b8976a);color:#1a2e1a;font-family:Georgia,serif;font-size:13px;font-weight:700;padding:15px 40px;border-radius:8px;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">
                Open Score Entry &rarr;
              </a>
            </td></tr>
          </table>

          <!-- Instructions -->
          <div style="font-size:13px;color:rgba(138,173,138,0.55);line-height:1.8;border-top:1px solid #2d482d;padding-top:16px;">
            <strong style="color:#f0ece4;">How it works:</strong><br>
            1. Open the link above on your phone<br>
            2. Tap &ldquo;Start Scoring&rdquo; to begin<br>
            3. Enter one team score per hole as you play<br>
            4. Submit your scorecard when all holes are done
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#162416;padding:16px 24px;text-align:center;border-top:1px solid #2d482d;">
          <a href="https://getlotusai.com" style="display:inline-block;text-decoration:none;font-size:0;">
            <img src="https://links.getlotusai.com/lotus-logo.png" alt="Lotus AI" height="18" style="display:inline-block;vertical-align:middle;width:auto;border-radius:3px;" /><span style="display:inline-block;vertical-align:middle;margin-left:8px;font-size:11px;letter-spacing:3px;color:#6b7b6b;text-transform:uppercase;font-weight:700;font-family:'Syne',Georgia,sans-serif;">Powered by Lotus AI</span>
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
