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

    const [
      { data: tournament },
      { data: groups },
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
        .select('id, name, tee_time, current_hole, status')
        .eq('tournament_id', tournamentId)
        .order('tee_time', { nullsFirst: false }),
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

    let ctx = `Tournament: ${tournament.name}\n`
    ctx += `Format: ${tournament.format}\n`
    ctx += `Date: ${new Date(tournament.date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })}\n`
    ctx += `Course: ${tournament.course}\n`
    ctx += `Holes: ${tournament.holes}, Total Par: ${totalPar || 'N/A'}\n`

    if (tournament.slope_rating) {
      ctx += `Course Slope: ${tournament.slope_rating}, Course Rating: ${tournament.course_rating ?? 'N/A'}\n`
    }

    if (tournament.stableford_points_config) {
      const p = tournament.stableford_points_config as Record<string, number>
      ctx += `\nStableford Points:\n`
      ctx += `  Double bogey or worse: ${p.double_bogey_or_worse ?? 0} pts\n`
      ctx += `  Bogey: ${p.bogey ?? 1} pts\n`
      ctx += `  Par: ${p.par ?? 3} pts\n`
      ctx += `  Birdie: ${p.birdie ?? 5} pts\n`
      ctx += `  Eagle: ${p.eagle ?? 10} pts\n`
      ctx += `  Albatross: ${p.albatross ?? 20} pts\n`
    }

    // Tee times
    const withTimes = (groups ?? []).filter(g => g.tee_time)
    if (withTimes.length > 0) {
      ctx += `\nTee Times:\n`
      for (const g of withTimes.slice(0, 12)) {
        const t = new Date(g.tee_time!).toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true,
        })
        ctx += `  ${g.name}: ${t}\n`
      }
    }

    // Live leaderboard (group totals)
    if ((scores ?? []).length > 0 && (groups ?? []).length > 0) {
      const byGroup = new Map<string, number>()
      for (const s of scores ?? []) {
        if (s.group_id) byGroup.set(s.group_id, (byGroup.get(s.group_id) ?? 0) + s.strokes)
      }
      const ranked = (groups ?? [])
        .filter(g => byGroup.has(g.id))
        .map(g => ({ name: g.name, total: byGroup.get(g.id)!, hole: g.current_hole ?? 1 }))
        .sort((a, b) => a.total - b.total)
        .slice(0, 5)

      if (ranked.length > 0) {
        ctx += `\nCurrent Leaderboard (Top 5):\n`
        ranked.forEach((r, i) => {
          const diff = totalPar > 0 ? r.total - totalPar : null
          const par = diff === null ? '' : ` (${diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`})`
          ctx += `  ${i + 1}. ${r.name} — ${r.total} strokes${par}, through hole ${r.hole}\n`
        })
      }
    }

    return ctx
  } catch {
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
