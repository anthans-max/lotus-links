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
npm test         # Run Vitest unit tests (once)
npm run test:watch  # Vitest in watch mode
```

Tests live in `lib/scoring/__tests__/`. To run a single test file:
```bash
npx vitest run lib/scoring/__tests__/handicap.test.ts
```

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — uses `@import "tailwindcss"` + `@theme` in `app/globals.css`. No `tailwind.config.js` exists.
- **Supabase** — use `@supabase/ssr` ONLY. `@supabase/auth-helpers-nextjs` remains in `package.json` but is unused and must not be used.
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
NEXT_PUBLIC_APP_URL=                 # Canonical domain (e.g. https://links.getlotusai.com); used by lib/url.ts getBaseUrl()
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

- **Tournament formats** — `tournament.format` drives both routing and scoring UI. Three values:
  - `'Scramble'` → chaperone at `/score/[groupId]` (`ScoreEntryApp`), one team score per hole
  - `'Stableford'` → `StablefordScoringApp` at `/t/[token]`, hole-by-hole group entry, computes Stableford points
  - `'Stroke Play'` → `StablefordScoringApp` at `/t/[token]`, scrollable per-player net stroke entry
- **Two scoring modes**: (1) Scramble — one team score per group per hole via chaperone at `/score/[groupId]`; (2) Stableford/individual — per-player per-hole scores via public token link at `/t/[token]` using `StablefordScoringApp`
- **Chaperone auth** — group PIN only, no login. Direct URL: `/score/[groupId]`
- **Scores** — upsert per-hole immediately (not full-card submit). Two UNIQUE constraints: `(group_id, tournament_id, hole_number)` for scramble; `(player_id, tournament_id, hole_number) WHERE player_id IS NOT NULL` for individual
- **Server Actions** — all DB mutations go through `lib/actions/*.ts` files marked `'use server'`. Pages/components import these directly (no separate API routes for mutations). Always call `revalidatePath()` after mutations.
- **Leaderboard** — Supabase Realtime + 15s polling fallback. Gated by `leaderboard_public` flag
- **Player status flow**: `pre-registered` → `registered` → `checked_in`
- **Group auto-generation** — respects mutual pairing preferences first, then one-way (stored in `pairing_preferences` table)
- **League isolation** — leagues filtered via `league_admins` table (not `admin_email` directly); super admin sees all. `lib/auth.ts` exports `checkLeagueAccess(leagueId)` and `getLeagueRole(leagueId)` → `'owner' | 'admin' | null`
- **Multi-admin** — owners invite additional admins by email via Resend (`lib/email.ts → sendLeagueAdminInviteEmail`). Invited users auto-accept on next Google OAuth login (`app/api/auth/callback`). Owners can remove admins; only owners see Delete league button and Create League. Invited admins see only their leagues and a "Manage Tournaments" shortcut button.
- **Logo upload** — Supabase Storage `logos` bucket, max 2MB (PNG/JPG/SVG/WEBP). Upload/remove handled via server actions in `lib/actions/storage.ts` (NOT client-side) to avoid Web Locks API contention with Supabase auth token refresh
- **Supabase browser client** — singleton in `lib/supabase/client.ts` (one instance per page load) to prevent concurrent Web Locks acquisitions deadlocking auth token refresh
- **Modal overlay** — `components/ui/Modal.tsx` uses `createPortal(content, document.body)` + body scroll lock. This bypasses parent CSS stacking contexts that break `position: fixed`
- **FK policy** — all child FKs CASCADE on delete, except `tournaments.season_id` which is SET NULL
- **RLS** — disabled on all tables (permissive for MVP)

## DB Schema

### leagues
`id` (uuid PK), `name`, `admin_email`, `logo_url`, `primary_color` (default `#1a5c2a`), `league_type`, `created_at`, `updated_at`

### league_admins
`id` (uuid PK), `league_id` FK→leagues (CASCADE), `email`, `role` (`owner` | `admin`), `invited_at`, `accepted_at` (null until first login), `invited_by`
UNIQUE on `(league_id, email)`. Seeded from `leagues.admin_email` on migration. New leagues seed an owner row in `createLeague`.

### seasons
`id`, `league_id` FK→leagues, `name`, `start_date`, `end_date`, `points_system` (default `fedex`)

### tournaments
`id`, `league_id` FK→leagues, `season_id` FK→seasons (SET NULL on delete), `name`, `date`, `course`, `format` (default `Scramble`), `holes` (int, 1-18), `status` (upcoming/active/completed), `course_source`, `tournament_type`, `login_required`, `shotgun_start`, `leaderboard_public`, `notes`, `public_token` (uuid, auto-generated — used for `/t/[token]` scoring link), `slope_rating`, `course_rating`, `stableford_points_config` (JSONB)

### holes
`id`, `tournament_id` FK, `hole_number`, `par`, `yardage` (nullable), `handicap` (nullable)

### players
`id`, `tournament_id` FK, `name`, `grade`, `handicap` (default 0, integer), `handicap_index` (USGA decimal), `skill_level`, `status` (pre-registered/registered/checked_in), `player_email`, `parent_name`, `parent_phone`, `parent_email`, `willing_to_chaperone` (boolean), `registration_comments`, `registered_at`

### groups
`id`, `tournament_id` FK, `name`, `chaperone_name`, `chaperone_email`, `chaperone_phone`, `pin`, `starting_hole` (default 1), `tee_time`, `current_hole` (default 1), `status` (not_started/in_progress/completed)

### group_players
`group_id` FK→groups, `player_id` FK→players (junction table)

### scores
`id`, `group_id` FK (nullable — null for individual scores), `player_id` FK→players (nullable — null for scramble scores), `tournament_id` FK, `hole_number`, `strokes`, `entered_by`, `submitted_at`
Two UNIQUE constraints: `(group_id, tournament_id, hole_number)` for scramble; partial `(player_id, tournament_id, hole_number) WHERE player_id IS NOT NULL` for individual

### pairing_preferences
`id`, `tournament_id` FK, `player_id` FK, `preferred_player_id` FK
UNIQUE on `(player_id, preferred_player_id)`

### chaperones
`id`, `tournament_id` FK (CASCADE), `name`, `email`, `phone`, `role` (`parent` | `coach` | `volunteer`), `created_at`
Formal chaperone registry — separate from the `players` table and from `groups.chaperone_name`.

### group_chaperones
`group_id` PK FK→groups (CASCADE), `chaperone_id` FK→chaperones (CASCADE), `assigned_at`
One formal chaperone per group. Managed via `lib/actions/chaperones.ts → assignChaperoneToGroup / removeChaperoneFromGroup`.

### group_scoring_tokens
`id`, `group_id` FK (CASCADE), `tournament_id` FK (CASCADE), `token` (uuid, UNIQUE), `created_at`, `expires_at`
UNIQUE INDEX on `(group_id, tournament_id)` — one token per group. Used for `/score/t/[token]` (no-PIN URL). Created via `getOrCreateGroupToken()`.

## Component Organization

```
components/
  admin/        → all admin dashboard components (league, tournament, player, group management)
  chaperone/    → ScoreEntryApp (scramble PIN-gated entry)
  scoring/      → StablefordScoringApp (Stableford + Stroke Play token-based entry)
  leaderboard/  → LiveLeaderboard (Realtime + polling)
  registration/ → RegistrationForm (public player self-registration)
  scorecard/    → ScorecardTable (read-only scorecard view)
  chat/         → ChatAssistant (AI-powered Q&A)
  ui/           → shared primitives: Modal, Badge, Button, Card, Input, Select, Spinner, etc.
```

All domain logic and DB access is in `lib/`:
- `lib/actions/` — server actions (groups, leagues, players, registration, scores, storage, tournament)
- `lib/scoring/` — pure scoring utilities: `handicap.ts`, `stableford.ts` (unit-tested)
- `lib/auth.ts` — `checkLeagueAccess`, `getLeagueRole`
- `lib/types.ts` — all TypeScript interfaces matching DB schema
- `lib/url.ts` — `getBaseUrl()` for shareable links
- `lib/email.ts` — Resend email helpers
- `lib/course-data.ts` — WISH hole presets + `createTournamentWithWishHoles()` server action

## Route Map

```
(admin)/login                     → Google OAuth
(admin)/dashboard                 → league list
(admin)/dashboard/leagues/[leagueId]
  /tournaments/[id]               → overview tabs: Holes, Players, Groups, Scores
(chaperone)/score/[groupId]       → PIN-gated mobile scramble score entry
/t/[token]                        → public token-based Stableford/individual scoring (StablefordScoringApp)
/register/[tournamentId]          → public player registration (no auth)
/leaderboard/[tournamentId]       → public live leaderboard (Realtime + 15s polling)
/scorecard/[tournamentId]         → token-based read-only scorecard view
/api/auth/callback                → OAuth code exchange
/score/t/[token]                  → token-based scramble scoring (no PIN) — maps token→group via group_scoring_tokens
/api/email/send-scoring-link      → Resend email trigger (modes: single, bulk, group-players, all-players, scorecard-summary, chaperone-token, all-chaperones-token)
/api/chat                         → Chat assistant (AI-powered scoring Q&A)
```

Migrations live in `supabase/migrations/` — numbered sequentially (001–014). Run them manually in the Supabase SQL editor; there is no CLI migration workflow.

`lib/course-data.ts` contains WISH tournament hole configuration pre-loaded (10 holes, all par-3). Use `createTournamentWithWishHoles()` server action to bootstrap a WISH tournament.

## Pre-Launch TODO

- [ ] Custom Resend domain needed before tournament day (currently `onboarding@resend.dev`, only delivers to verified account email)
- [ ] Leaderboard link on chaperone scoring success page
