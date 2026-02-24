# Lotus Links — Project Brief

Golf tournament management platform. See /design-reference/ for full PRD and UI prototypes.

## Current Phase
MVP Phase 1 — WISH Charter School tournament (end of March deadline)

## Stack
Next.js 14, Tailwind, Supabase, Vercel

## Design
Match lotus-links.jsx and chaperone-scoreentry.jsx prototypes exactly.
Dark forest green, aged gold, Playfair Display headings.

## Key Rules
- No red colors anywhere in the UI (use amber/gold for over par)
- Mobile-first on all screens
- Do not build beyond MVP Phase 1 scope yet

## File Structure
app/
  ├── favicon.ico
  ├── globals.css
  ├── layout.tsx
  ├── page.tsx
  ├── (admin)/
  │   ├── layout.tsx
  │   ├── login/page.tsx
  │   └── dashboard/
  │       ├── page.tsx
  │       └── leagues/
  │           ├── page.tsx
  │           ├── new/page.tsx
  │           └── [leagueId]/
  │               ├── page.tsx
  │               └── tournaments/
  │                   ├── new/page.tsx
  │                   └── [id]/
  │                       ├── page.tsx
  │                       ├── holes/page.tsx
  │                       ├── players/page.tsx
  │                       ├── groups/page.tsx
  │                       └── scores/page.tsx
  ├── (chaperone)/
  │   ├── layout.tsx
  │   └── score/[groupId]/page.tsx
  ├── register/
  │   └── [tournamentId]/
  │       └── page.tsx
  ├── api/
  │   └── auth/callback/route.ts
  └── leaderboard/
      ├── page.tsx
      └── [tournamentId]/page.tsx

## Completed
- [x] Sprint 0: Scaffolding — Next.js, Tailwind, Supabase client, auth, basic routing
- [x] Sprint 1: League setup, tournament creation, hole configuration
- [x] Sprint 2: Player management, parent registration, group pairings
- [x] Sprint 3: Scoring & leaderboard — chaperone score entry, live leaderboard, admin score monitoring, check-in

## Decisions Made (Sprint 1 additions)
- Number of holes is a free input (1-18), not just 9/18 — The Lakes has 10
- League primary color includes red option for school branding (WISH is red)
- League brand colors are separate from app UI (app stays green/gold, no red in chrome)

## Decisions Made (Sprint 2 additions)
- Player status: pre-registered → registered → checked_in
- Registration page is public (no auth), uses server actions for DB writes
- Pairing preferences stored in separate table, used for smart auto-group generation
- Destructive actions (delete player/group) use amber/gold confirmation, NOT red
- Auto-generate groups respects mutual pairing preferences first, then one-way
- Groups page and Players page are separate routes (not DashboardShell tabs)

## Decisions Made (Sprint 3 additions)
- Chaperone score entry: hole-by-hole stepper with +/- and quick buttons, matching chaperone-scoreentry.jsx prototype
- Scores save per-hole immediately via upsert (not full-card submit only)
- Leaderboard is Supabase Realtime + 15s polling fallback
- Admin can toggle leaderboard_public on/off from scores monitoring page
- Admin can edit individual scores from the scores monitoring page
- Check-in: admin can check in registered players (registered → checked_in) from players page
- Leaderboard URL is /leaderboard/[tournamentId] (old /leaderboard is a redirect)

## DB Schema

### leagues
id (uuid PK), name (text), admin_email (text), logo_url (text), primary_color (text default '#1a5c2a'), created_at (timestamptz)

### seasons
id (uuid PK), league_id (uuid FK→leagues), name (text), start_date (date), end_date (date), points_system (text default 'fedex'), created_at (timestamptz)

### tournaments
id (uuid PK), league_id (uuid FK→leagues), season_id (uuid FK→seasons), name (text), date (date), course (text), format (text default 'Scramble'), holes (int default 18), status (text default 'upcoming'), course_source (text default 'manual'), tournament_type (text default 'real_course'), login_required (boolean default false), shotgun_start (boolean default false), leaderboard_public (boolean default false), notes (text), created_at (timestamptz)

### holes
id (uuid PK), tournament_id (uuid FK→tournaments), hole_number (int), par (int), yardage (int nullable), handicap (int nullable)

### players
id (uuid PK), tournament_id (uuid FK→tournaments), name (text), grade (text nullable), handicap (int default 0), skill_level (text nullable), status (text default 'pre-registered'), parent_name (text nullable), parent_phone (text nullable), registered_at (timestamptz nullable), created_at (timestamptz)

### groups
id (uuid PK), tournament_id (uuid FK→tournaments), name (text), chaperone_name (text nullable), pin (text), starting_hole (int default 1), tee_time (time nullable), current_hole (int default 1), status (text default 'not_started'), created_at (timestamptz)

### group_players
group_id (uuid FK→groups), player_id (uuid FK→players) — junction table

### scores
id (uuid PK), group_id (uuid FK→groups), tournament_id (uuid FK→tournaments), hole_number (int), strokes (int), entered_by (text nullable), submitted_at (timestamptz)
UNIQUE constraint on (group_id, tournament_id, hole_number)

### pairing_preferences
id (uuid PK), tournament_id (uuid FK→tournaments), player_id (uuid FK→players), preferred_player_id (uuid FK→players), created_at (timestamptz)
UNIQUE(player_id, preferred_player_id)

Also add under Key Rules:
- All child table FKs CASCADE on delete except tournaments.season_id which is SET NULL
- RLS is disabled on all Lotus Links tables (permissive for MVP)
- Chaperone auth via group PIN (no login needed)
- Scores save per-hole immediately via upsert (not full-card submit)
- Supabase Realtime on scores table powers live leaderboard
