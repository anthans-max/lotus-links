import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM_ADDRESS = 'Lotus Links <anthan@lotusailab.app>'

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

function buildPlayerScoringEmailHtml(data: Omit<PlayerScoringEmailPayload, 'to'>) {
  const { playerName, groupName, players, scoringUrl, tournamentName, courseName, tournamentDate } = data

  const playerRows = players
    .map(
      (name) =>
        `<tr><td style="padding:6px 12px;font-size:14px;color:#f0ede6;border-bottom:1px solid rgba(255,255,255,0.06);font-family:Georgia,serif;">${name}</td></tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a120a;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a120a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#132013;border:1px solid rgba(200,168,75,0.25);border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d3d1a,#132013);padding:28px 24px;text-align:center;border-bottom:1px solid rgba(200,168,75,0.25);">
          <div style="font-size:12px;letter-spacing:3px;color:#c8a84b;text-transform:uppercase;margin-bottom:8px;">Lotus Links</div>
          <div style="font-family:Georgia,serif;font-size:22px;color:#f0ede6;margin-bottom:4px;">${tournamentName}</div>
          <div style="font-size:13px;color:rgba(240,237,230,0.55);">${courseName} &middot; ${tournamentDate}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px;">
          <div style="font-family:Georgia,serif;font-size:18px;color:#f0ede6;margin-bottom:4px;">
            ${playerName ? `Hi ${playerName},` : 'Hello,'}
          </div>
          <div style="font-size:14px;color:rgba(240,237,230,0.55);margin-bottom:20px;line-height:1.6;">
            You&rsquo;re registered for <strong style="color:#c8a84b;">${groupName}</strong>.
            Use the link below to enter your scores on tournament day.
          </div>

          <!-- Group info card -->
          <table width="100%" style="background:#1a2e1a;border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:20px;" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 16px;">
              <div style="font-size:11px;letter-spacing:2px;color:rgba(240,237,230,0.28);text-transform:uppercase;margin-bottom:8px;">Your Group</div>
              <div style="font-family:Georgia,serif;font-size:16px;color:#c8a84b;margin-bottom:4px;">${groupName}</div>
            </td></tr>
            ${
              players.length > 0
                ? `<tr><td style="padding:0 16px 12px;">
                    <div style="font-size:11px;letter-spacing:2px;color:rgba(240,237,230,0.28);text-transform:uppercase;margin-bottom:6px;">Players</div>
                    <table width="100%" cellpadding="0" cellspacing="0">${playerRows}</table>
                  </td></tr>`
                : ''
            }
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:4px 0 20px;">
              <a href="${scoringUrl}" style="display:inline-block;background:linear-gradient(135deg,#c8a84b,#a08030);color:#0a120a;font-family:Georgia,serif;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                Enter My Scores &rarr;
              </a>
            </td></tr>
          </table>

          <!-- Footer note -->
          <div style="font-size:13px;color:rgba(240,237,230,0.55);line-height:1.6;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
            Open the link above on your phone to enter scores hole-by-hole as you play.
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0d3d1a;padding:16px 24px;text-align:center;border-top:1px solid rgba(200,168,75,0.25);">
          <div style="font-size:11px;color:rgba(240,237,230,0.28);">Powered by Lotus Links</div>
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
    .map(
      (name) =>
        `<tr><td style="padding:6px 12px;font-size:14px;color:#f0ede6;border-bottom:1px solid rgba(255,255,255,0.06);font-family:Georgia,serif;">${name}</td></tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a120a;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a120a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#132013;border:1px solid rgba(200,168,75,0.25);border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0d3d1a,#132013);padding:28px 24px;text-align:center;border-bottom:1px solid rgba(200,168,75,0.25);">
          <div style="font-size:12px;letter-spacing:3px;color:#c8a84b;text-transform:uppercase;margin-bottom:8px;">Lotus Links</div>
          <div style="font-family:Georgia,serif;font-size:22px;color:#f0ede6;margin-bottom:4px;">${tournamentName}</div>
          <div style="font-size:13px;color:rgba(240,237,230,0.55);">${courseName} &middot; ${tournamentDate}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px;">
          <div style="font-family:Georgia,serif;font-size:18px;color:#f0ede6;margin-bottom:4px;">
            ${chaperoneName ? `Hi ${chaperoneName},` : 'Hello,'}
          </div>
          <div style="font-size:14px;color:rgba(240,237,230,0.55);margin-bottom:20px;line-height:1.6;">
            You&rsquo;ve been assigned as chaperone for <strong style="color:#c8a84b;">${groupName}</strong>.
            Use the link below to enter scores on tournament day.
          </div>

          <!-- Group info card -->
          <table width="100%" style="background:#1a2e1a;border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:20px;" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 16px;">
              <div style="font-size:11px;letter-spacing:2px;color:rgba(240,237,230,0.28);text-transform:uppercase;margin-bottom:8px;">Your Group</div>
              <div style="font-family:Georgia,serif;font-size:16px;color:#c8a84b;margin-bottom:4px;">${groupName}</div>
              <div style="font-size:12px;color:rgba(240,237,230,0.55);">Starting Hole: ${startingHole}</div>
            </td></tr>
            ${
              players.length > 0
                ? `<tr><td style="padding:0 16px 12px;">
                    <div style="font-size:11px;letter-spacing:2px;color:rgba(240,237,230,0.28);text-transform:uppercase;margin-bottom:6px;">Players</div>
                    <table width="100%" cellpadding="0" cellspacing="0">${playerRows}</table>
                  </td></tr>`
                : ''
            }
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:4px 0 20px;">
              <a href="${scoringUrl}" style="display:inline-block;background:linear-gradient(135deg,#c8a84b,#a08030);color:#0a120a;font-family:Georgia,serif;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                Open Score Entry &rarr;
              </a>
            </td></tr>
          </table>

          <!-- Instructions -->
          <div style="font-size:13px;color:rgba(240,237,230,0.55);line-height:1.6;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
            <strong style="color:#f0ede6;">How it works:</strong><br>
            1. Open the link above on your phone<br>
            2. Enter your group PIN when prompted<br>
            3. Enter one team score per hole as you play<br>
            4. Submit your scorecard when all holes are done
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0d3d1a;padding:16px 24px;text-align:center;border-top:1px solid rgba(200,168,75,0.25);">
          <div style="font-size:11px;color:rgba(240,237,230,0.28);">Powered by Lotus Links</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
