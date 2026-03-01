import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'Lotus Links <hello@getlotusai.com>'

interface ScoringLinkEmailPayload {
  to: string
  groupName: string
  chaperoneName: string | null
  players: string[]
  startingHole: number
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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
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
          <div style="font-size:11px;color:#4a6a4a;">Powered by Lotus Links</div>
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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
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
              <div style="font-size:12px;color:rgba(138,173,138,0.55);">Starting Hole: ${startingHole}</div>
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
            2. Enter your group PIN when prompted<br>
            3. Enter one team score per hole as you play<br>
            4. Submit your scorecard when all holes are done
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#162416;padding:16px 24px;text-align:center;border-top:1px solid #2d482d;">
          <div style="font-size:11px;color:#4a6a4a;">Powered by Lotus Links</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
