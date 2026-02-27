# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lotus Links — Golf tournament management platform for WISH Charter School tournament.
MVP Phase 1 deadline: end of March 2026.

## Development Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite — this project has no tests configured.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — uses `@import "tailwindcss"` + `@theme` in `app/globals.css`. No `tailwind.config.js` exists.
- **Supabase** — use `@supabase/ssr` ONLY. `@supabase/auth-helpers-nextjs` is deprecated and must not be used.
- **Resend** — email via `resend` npm package, API route at `/api/email/send-scoring-link`
- **Vercel** deployment via GitHub

## Supabase Client Pattern

Always use the correct client for context:

```ts
// Server Components, API routes, layouts
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Client Components ('use client')
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

Auth uses Google OAuth. Admin pages check `lib/auth.ts → checkLeagueAccess(leagueId)` for league-level access control. Super admin override via `NEXT_PUBLIC_SUPER_ADMIN_EMAIL`.

There is **no middleware.ts** — route protection is done at the page/layout level.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Must be a long JWT (eyJ...), not sb_publishable_...
NEXT_PUBLIC_SUPER_ADMIN_EMAIL=       # Email that bypasses league isolation
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

## Design System

### Rules
- **No red colors anywhere** — use amber/gold for warnings, over-par, destructive actions. League brand reds are accent-only.
- Mobile-first at 375px. Dark theme throughout.
- Reference files in `/design-reference/` define the exact aesthetic — match them precisely.

### Exact CSS Custom Properties (defined in `app/globals.css` `:root`)
```css
--bg: #0a120a;  --surface: #132013;  --surface2: #1a2e1a;  --surface3: #203020;
--forest: #0d3d1a;
--gold: #c8a84b;  --gold-light: #e6c96a;  --gold-dim: rgba(200,168,75,0.15);  --gold-border: rgba(200,168,75,0.25);
--text: #f0ede6;  --text-muted: rgba(240,237,230,0.55);  --text-dim: rgba(240,237,230,0.28);
--over: #d4a017;   /* over-par color — distinct from gold */
--border: rgba(255,255,255,0.06);  --border2: rgba(255,255,255,0.1);
```

### Fonts (all set on `<html>` in `app/layout.tsx`)
- `--fd` → Playfair Display (headings)
- `--fb` → Crimson Pro (admin body)
- Outfit → chaperone body
- `--fm` → DM Mono (labels/mono)

### Pre-built CSS Classes (use these, don't create custom variants)
`globals.css` defines all component classes: `btn`, `btn-gold`, `btn-outline`, `btn-ghost`, `btn-sm`, `card`, `card-gold`, `card-hover`, `input`, `label`, `badge` (gold/green/red/blue/gray), `nav-tab`, `lb-row`, `sc-table`, `sc-birdie`, `sc-eagle`, `sc-bogey`, `sc-par`, `hole-pill`, `submit-btn`, `pin-digit`, `keypad-btn`, `g2`, `g3`, `g4`.

## Key Architecture Decisions

- **Scramble format only** — one team score per group per hole
- **Chaperone auth** — group PIN only, no login. Direct URL: `/score/[groupId]`
- **Scores** — upsert per-hole immediately (not full-card submit). UNIQUE on `(group_id, tournament_id, hole_number)`
- **Leaderboard** — Supabase Realtime + 15s polling fallback. Gated by `leaderboard_public` flag
- **Player status flow**: `pre-registered` → `registered` → `checked_in`
- **Group auto-generation** — respects mutual pairing preferences first, then one-way (stored in `pairing_preferences` table)
- **League isolation** — leagues filtered by `admin_email`; super admin sees all
- **Logo upload** — Supabase Storage `logos` bucket, max 2MB (PNG/JPG/SVG/WEBP), handled in `lib/storage.ts`
- **FK policy** — all child FKs CASCADE on delete, except `tournaments.season_id` which is SET NULL
- **RLS** — disabled on all tables (permissive for MVP)

## DB Schema

### leagues
`id` (uuid PK), `name`, `admin_email`, `logo_url`, `primary_color` (default `#1a5c2a`), `created_at`, `updated_at`

### seasons
`id`, `league_id` FK→leagues, `name`, `start_date`, `end_date`, `points_system` (default `fedex`)

### tournaments
`id`, `league_id` FK→leagues, `season_id` FK→seasons (SET NULL on delete), `name`, `date`, `course`, `format` (default `Scramble`), `holes` (int, 1-18), `status` (upcoming/active/completed), `course_source`, `tournament_type`, `login_required`, `shotgun_start`, `leaderboard_public`, `notes`

### holes
`id`, `tournament_id` FK, `hole_number`, `par`, `yardage` (nullable), `handicap` (nullable)

### players
`id`, `tournament_id` FK, `name`, `grade`, `handicap` (default 0), `skill_level`, `status` (pre-registered/registered/checked_in), `parent_name`, `parent_phone`, `willing_to_chaperone` (boolean), `registered_at`

### groups
`id`, `tournament_id` FK, `name`, `chaperone_name`, `chaperone_email`, `chaperone_phone`, `pin`, `starting_hole` (default 1), `tee_time`, `current_hole` (default 1), `status` (not_started/in_progress/completed)

### group_players
`group_id` FK→groups, `player_id` FK→players (junction table)

### scores
`id`, `group_id` FK, `tournament_id` FK, `hole_number`, `strokes`, `entered_by`, `submitted_at`
UNIQUE constraint on `(group_id, tournament_id, hole_number)`

### pairing_preferences
`id`, `tournament_id` FK, `player_id` FK, `preferred_player_id` FK
UNIQUE on `(player_id, preferred_player_id)`

## Route Map

```
(admin)/login            → Google OAuth
(admin)/dashboard        → league list
(admin)/dashboard/leagues/[leagueId]
  /tournaments/[id]      → overview tabs: Holes, Players, Groups, Scores
(chaperone)/score/[groupId]  → PIN-gated mobile score entry
/register/[tournamentId]     → public player registration (no auth)
/leaderboard/[tournamentId]  → public live leaderboard
/api/auth/callback           → OAuth code exchange
/api/email/send-scoring-link → Resend email trigger
```

## Pre-Launch TODO

- [ ] Custom Resend domain needed before tournament day (currently `onboarding@resend.dev`, only delivers to verified account email)
- [ ] Leaderboard link on chaperone scoring success page
