import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── In-memory rate limit ─────────────────────────────────────────────────────
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'anonymous'
  )
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// ── Guardrails ───────────────────────────────────────────────────────────────
const GOLF_KEYWORDS = [
  'golf', 'score', 'scoring', 'hole', 'holes', 'par', 'birdie', 'bogey', 'eagle',
  'albatross', 'handicap', 'stableford', 'scramble', 'stroke', 'strokes',
  'tee', 'fairway', 'green', 'putt', 'chip', 'bunker', 'hazard', 'tournament',
  'leaderboard', 'player', 'players', 'group', 'groups', 'chaperone', 'course',
  'yardage', 'format', 'round', 'iron', 'driver', 'wedge', 'putter', 'pin',
  'flag', 'rough', 'net', 'gross', 'slope', 'rating', 'usga', 'wish', 'lotus',
  'leading', 'winning', 'points', 'pairing', 'foursome', 'four ball', 'match play',
  'stroke play', 'raw score', 'register', 'team', 'tee time', 'teetime', 'links',
]

const BLOCKED_TOPICS = [
  'politics', 'political', 'democrat', 'republican', 'president', 'election',
  'religion', 'god', 'church', 'mosque', 'temple', 'pray', 'bible', 'quran',
  'medical advice', 'diagnosis', 'symptom', 'prescription',
  'legal advice', 'lawsuit', 'attorney', 'sue',
  'financial advice', 'invest', 'stock market', 'crypto', 'bitcoin',
  'hack', 'exploit', 'weapon', 'violent',
]

const OFF_TOPIC_REPLY =
  "I'm set up to help with golf scoring and this tournament. For anything else, please ask a tournament official or league admin!"

function hasGolfContent(msg: string): boolean {
  // Short messages (greetings, thanks) pass through for LLM to handle gracefully
  if (msg.length <= 30) return true
  const lower = msg.toLowerCase()
  return GOLF_KEYWORDS.some(kw => lower.includes(kw))
}

function hasBlockedContent(msg: string): boolean {
  const lower = msg.toLowerCase()
  return BLOCKED_TOPICS.some(kw => lower.includes(kw))
}

// ── Tournament context ───────────────────────────────────────────────────────
async function fetchTournamentContext(tournamentId: string): Promise<string> {
  try {
    const supabase = await createClient()

    type GroupRow = {
      id: string
      name: string
      tee_time: string | null
      starting_hole: number | null
      chaperone_name: string | null
      current_hole: number | null
      status: string | null
      group_players: Array<{ player_id: string; players: { name: string } | null }>
    }

    const [
      { data: tournament },
      { data: groups },
      { data: players },
      { data: scores },
      { data: holes },
    ] = await Promise.all([
      supabase
        .from('tournaments')
        .select('name, format, date, course, holes, slope_rating, course_rating, stableford_points_config')
        .eq('id', tournamentId)
        .single(),
      supabase
        .from('groups')
        .select('id, name, tee_time, starting_hole, chaperone_name, current_hole, status, group_players(player_id, players(name))')
        .eq('tournament_id', tournamentId)
        .order('tee_time', { nullsFirst: false }) as unknown as Promise<{ data: GroupRow[] | null }>,
      supabase
        .from('players')
        .select('id, name, handicap, skill_level, grade')
        .eq('tournament_id', tournamentId)
        .order('name'),
      supabase
        .from('scores')
        .select('group_id, player_id, hole_number, strokes')
        .eq('tournament_id', tournamentId),
      supabase
        .from('holes')
        .select('hole_number, par')
        .eq('tournament_id', tournamentId)
        .order('hole_number'),
    ])

    if (!tournament) return 'No tournament context available.'

    const totalPar = (holes ?? []).reduce((s, h) => s + h.par, 0)
    const groupList = groups ?? []
    const playerList = players ?? []
    const scoreList = scores ?? []

    // ── Header ──
    let ctx = `TOURNAMENT: ${tournament.name}\n`
    ctx += `DATE: ${new Date(tournament.date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })}\n`
    ctx += `COURSE: ${tournament.course}\n`
    ctx += `FORMAT: ${tournament.format}\n`
    ctx += `HOLES: ${tournament.holes} | PAR: ${totalPar || 'N/A'}\n`

    if (tournament.slope_rating) {
      ctx += `Course Slope: ${tournament.slope_rating} | Course Rating: ${tournament.course_rating ?? 'N/A'}\n`
    }

    if (tournament.stableford_points_config) {
      const p = tournament.stableford_points_config as Record<string, number>
      ctx += `STABLEFORD POINTS: double bogey or worse=${p.double_bogey_or_worse ?? 0}, bogey=${p.bogey ?? 1}, par=${p.par ?? 3}, birdie=${p.birdie ?? 5}, eagle=${p.eagle ?? 10}, albatross=${p.albatross ?? 20}\n`
    }

    // ── Players ──
    ctx += `\nPLAYERS (${playerList.length} total):\n`
    if (playerList.length <= 30) {
      for (const p of playerList) {
        const details: string[] = []
        if (p.grade) details.push(`Grade ${p.grade}`)
        if (p.skill_level) details.push(p.skill_level)
        if (p.handicap != null && p.handicap > 0) details.push(`HCP ${p.handicap}`)
        ctx += `- ${p.name}${details.length ? ` (${details.join(', ')})` : ''}\n`
      }
    } else {
      ctx += `(${playerList.length} players registered)\n`
    }

    // ── Groups & Pairings ──
    if (groupList.length > 0) {
      ctx += `\nGROUPS & PAIRINGS:\n`
      for (const g of groupList) {
        const memberNames = (g.group_players ?? [])
          .map(gp => gp.players?.name)
          .filter((n): n is string => Boolean(n))
          .join(', ')

        const meta: string[] = []
        if (g.tee_time) {
          meta.push(`Tee: ${new Date(g.tee_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`)
        }
        if (g.starting_hole) meta.push(`Hole ${g.starting_hole}`)
        const chaperone = g.chaperone_name ? ` | Chaperone: ${g.chaperone_name}` : ''
        const metaStr = meta.length ? ` (${meta.join(', ')})` : ''

        ctx += `- ${g.name}${metaStr}: ${memberNames || 'No players assigned'}${chaperone}\n`
      }
    }

    // ── Tee Times (sorted, dedicated section for easy lookup) ──
    const withTimes = groupList.filter(g => g.tee_time)
    if (withTimes.length > 0) {
      ctx += `\nTEE TIMES:\n`
      for (const g of withTimes) {
        const t = new Date(g.tee_time!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        ctx += `- ${g.name}: ${t} (starting hole ${g.starting_hole ?? 1})\n`
      }
    }

    // ── Leaderboard ──
    if (scoreList.length > 0) {
      // Scramble: scores keyed by group_id (player_id is null)
      const byGroup = new Map<string, number>()
      // Individual: scores keyed by player_id
      const byPlayer = new Map<string, number>()

      for (const s of scoreList) {
        if (s.group_id && !s.player_id) {
          byGroup.set(s.group_id, (byGroup.get(s.group_id) ?? 0) + s.strokes)
        } else if (s.player_id) {
          byPlayer.set(s.player_id, (byPlayer.get(s.player_id) ?? 0) + s.strokes)
        }
      }

      if (byGroup.size > 0) {
        const ranked = groupList
          .filter(g => byGroup.has(g.id))
          .map(g => ({ name: g.name, total: byGroup.get(g.id)!, hole: g.current_hole ?? 1 }))
          .sort((a, b) => a.total - b.total)
          .slice(0, 10)

        ctx += `\nLEADERBOARD (scoring in progress):\n`
        ranked.forEach((r, i) => {
          const diff = totalPar > 0 ? r.total - totalPar : null
          const rel = diff === null ? '' : ` (${diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`})`
          ctx += `${i + 1}. ${r.name} — ${r.total} strokes${rel}, through hole ${r.hole}\n`
        })
      } else if (byPlayer.size > 0) {
        const playerMap = new Map(playerList.map(p => [p.id, p.name]))
        const ranked = Array.from(byPlayer.entries())
          .map(([id, total]) => ({ name: playerMap.get(id) ?? 'Unknown', total }))
          .sort((a, b) => a.total - b.total)
          .slice(0, 10)

        ctx += `\nLEADERBOARD (scoring in progress):\n`
        ranked.forEach((r, i) => {
          const diff = totalPar > 0 ? r.total - totalPar : null
          const rel = diff === null ? '' : ` (${diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`})`
          ctx += `${i + 1}. ${r.name} — ${r.total} strokes${rel}\n`
        })
      }
    } else {
      ctx += `\nLEADERBOARD: Scoring has not started yet.\n`
    }

    return ctx
  } catch (err) {
    console.error('[chat] fetchTournamentContext error:', err)
    return 'Tournament context temporarily unavailable.'
  }
}

// ── System prompt ────────────────────────────────────────────────────────────
const BASE_PROMPT = `You are the Lotus Links golf assistant. You help players, parents, and scorers understand golf scoring and get information about the current tournament. You are friendly, concise, and knowledgeable about golf.

You are strictly limited to the following topics:
- Golf rules, etiquette, and terminology
- Scoring formats: Stableford, Raw Score, Scramble, Four Ball, Foursome
- Handicap calculations using the USGA Course Handicap formula:
  Course Handicap = ROUND(Handicap Index × (Slope ÷ 113) + (Course Rating − Par))
- Stableford points: net double bogey or worse (0 pts), net bogey (1 pt), net par (3 pts), net birdie (5 pts), net eagle (10 pts), net albatross (20 pts) — always use the tournament's configured point values when provided
- Information about the current tournament (use the context provided below)
- Tee times and pairings for the current tournament
- Leaderboard and scoring questions for the current tournament

You have access to the complete player list, group pairings, tee times, and current leaderboard in the context below. Use this data to answer specific questions:
- "Who is [name] paired with?" → find their group in GROUPS & PAIRINGS and list the other players in that group
- "How many players are in the tournament?" → report the count from the PLAYERS section
- "When does [group] tee off?" → find their entry in TEE TIMES or GROUPS & PAIRINGS
- "Who is leading?" → report standings from the LEADERBOARD section
If a player or group name is not found in the data, say so clearly rather than guessing.

If a user asks about anything outside of golf or this tournament, respond:
"I'm set up to help with golf scoring and this tournament. For anything else, please ask a tournament official or league admin!"

Never make up scores, tee times, or player information. Only report what is in the tournament context provided. If you don't know something, say so.

Keep responses concise — 2 to 4 sentences for most answers. Use plain language; avoid jargon unless the user has used it first.

Current tournament context:
{CONTEXT}`

// ── Anthropic streaming ──────────────────────────────────────────────────────
async function streamAnthropic(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<Response> {
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system,
      messages,
      stream: true,
    }),
  })

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => '(unreadable)')
    console.error(`[chat] Anthropic error ${upstream.status}:`, body)
    throw new Error(`Anthropic ${upstream.status}: ${body}`)
  }

  return toSSEStream(upstream, chunk => {
    if (chunk.type === 'content_block_delta') {
      const delta = chunk.delta as { type?: string; text?: string } | undefined
      if (delta?.type === 'text_delta' && delta.text) return delta.text
    }
    return null
  })
}

// ── OpenAI fallback ──────────────────────────────────────────────────────────
async function streamOpenAI(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<Response> {
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      stream: true,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })

  if (!upstream.ok) throw new Error(`OpenAI ${upstream.status}`)

  return toSSEStream(upstream, chunk => {
    const choices = chunk.choices as Array<{ delta?: { content?: string } }> | undefined
    return choices?.[0]?.delta?.content ?? null
  })
}

// ── Generic SSE transformer ──────────────────────────────────────────────────
function toSSEStream(
  upstream: Response,
  extract: (parsed: Record<string, unknown>) => string | null,
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let closed = false

      const close = () => {
        if (!closed) {
          closed = true
          controller.enqueue(enc('data: [DONE]\n\n'))
          controller.close()
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { close(); break }

          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') { close(); return }
            try {
              const parsed = JSON.parse(data) as Record<string, unknown>
              const text = extract(parsed)
              if (text) controller.enqueue(enc(`data: ${JSON.stringify({ content: text })}\n\n`))
              // Detect Anthropic message_stop
              if ((parsed as { type?: string }).type === 'message_stop') { close(); return }
            } catch { /* skip malformed */ }
          }
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

const enc = (s: string) => new TextEncoder().encode(s)

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit
  if (!checkRateLimit(getClientIp(req))) {
    return Response.json(
      { error: "You're sending messages quickly — please wait a moment before trying again." },
      { status: 429 },
    )
  }

  // Parse body
  let body: { message?: string; tournamentId?: string; history?: { role: string; content: string }[] }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { message, tournamentId, history = [] } = body

  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Message required' }, { status: 400 })
  }

  // 300-char server cap
  if (message.length > 300) {
    return Response.json({ error: 'Message too long (max 300 characters)' }, { status: 400 })
  }

  // Blocked content
  if (hasBlockedContent(message)) {
    return sseDirectReply(OFF_TOPIC_REPLY)
  }

  // Off-topic short-circuit
  if (!hasGolfContent(message)) {
    return sseDirectReply(OFF_TOPIC_REPLY)
  }

  // Build context + system prompt
  const context = tournamentId
    ? await fetchTournamentContext(tournamentId)
    : 'No specific tournament context available.'

  const system = BASE_PROMPT.replace('{CONTEXT}', context)

  const msgs = [
    ...history
      .filter(h => h.role === 'user' || h.role === 'assistant')
      .slice(-10)
      .map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: message },
  ]

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      return await streamAnthropic(system, msgs)
    } else if (process.env.OPENAI_API_KEY) {
      return await streamOpenAI(system, msgs)
    } else {
      return Response.json({ error: 'No AI provider configured' }, { status: 503 })
    }
  } catch (err) {
    console.error('[chat] API error:', err)
    return Response.json(
      { error: "Sorry, I'm having trouble connecting. Please try again in a moment." },
      { status: 500 },
    )
  }
}

function sseDirectReply(text: string): Response {
  return new Response(
    `data: ${JSON.stringify({ content: text })}\ndata: [DONE]\n\n`,
    { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } },
  )
}
