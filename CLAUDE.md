# Lotus Links — Project Brief

Golf tournament management platform for WISH Charter School tournament.

## Current Phase
MVP Phase 1 — WISH Charter School tournament (end of March 2026 deadline)

## Stack
Next.js 14 (App Router), Tailwind CSS, Supabase, Vercel

## Design
- Match lotus-links.jsx and chaperone-scoreentry.jsx prototypes in /design-reference/
- Dark forest green (#1a3c2a), aged gold (#b8960c / #d4af37), cream (#f5f0e8)
- Playfair Display for headings, clean sans-serif for body
- Dark theme throughout — light text on dark backgrounds

## Key Rules
- **No red colors anywhere in the app UI** (use amber/gold for over par, warnings, destructive actions). League brand colors like WISH's red are only for league-specific branding accents.
- Mobile-first on all screens (design at 375px first)
- Do not build beyond MVP Phase 1 scope
- All child table FKs CASCADE on delete except tournaments.season_id which is SET NULL
- RLS is disabled on all Lotus Links tables (permissive for MVP)
- Chaperone auth via group PIN (no login needed)
- Scores save per-hole immediately via upsert (not full-card submit)
- Supabase Realtime on scores table powers live leaderboard

## File Structure
```
app/
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
  │   └── [tournamentId]/page.tsx
  ├── api/
  │   ├── auth/callback/route.ts
  │   └── email/send-scoring-link/route.ts
  └── leaderboard/
      ├── page.tsx
      └── [tournamentId]/page.tsx
```

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
id (uuid PK), tournament_id (uuid FK→tournaments), name (text), chaperone_name (text nullable), chaperone_email (text nullable), chaperone_phone (text nullable), pin (text), starting_hole (int default 1), tee_time (time nullable), current_hole (int default 1), status (text default 'not_started'), created_at (timestamptz)

### group_players
group_id (uuid FK→groups), player_id (uuid FK→players) — junction table

### scores
id (uuid PK), group_id (uuid FK→groups), tournament_id (uuid FK→tournaments), hole_number (int), strokes (int), entered_by (text nullable), submitted_at (timestamptz)
UNIQUE constraint on (group_id, tournament_id, hole_number)

### pairing_preferences
id (uuid PK), tournament_id (uuid FK→tournaments), player_id (uuid FK→players), preferred_player_id (uuid FK→players), created_at (timestamptz)
UNIQUE(player_id, preferred_player_id)

## Sprint Status
- [x] Sprint 0: Scaffolding — Next.js, Tailwind, Supabase client, auth, basic routing
- [x] Sprint 1: League setup, tournament creation, hole configuration
- [x] Sprint 2: Player management, parent registration, group pairings
- [x] Sprint 3: Chaperone score entry, leaderboard, check-in, admin score monitoring
- [x] Sprint 4: Chaperone link sharing — copy/email scoring links, bulk send
- [x] Sprint 5A: Tournament UX — tab navigation, edit player/group, clickable cards, delete button audit, card alignment
- [x] Sprint 5B: Public leaderboard polish, registration volunteer, leaderboard links
- [x] Sprint 5C: Admin infrastructure — delete/edit league, logo upload, color theming, league isolation, homepage

## Key Decisions
- Scramble format only for MVP (one team score per group per hole)
- Number of holes is a free input (1-18) — The Lakes at El Segundo has 10
- Player status flow: pre-registered → registered → checked_in
- Registration page is public (no auth required)
- Pairing preferences stored in separate table, used for smart auto-group generation
- Auto-generate groups respects mutual pairing preferences first, then one-way
- Chaperone scoring page requires no auth — direct link via /score/[groupId]
- Leaderboard is per-tournament at /leaderboard/[tournamentId], gated by leaderboard_public flag
- Leaderboard uses Supabase Realtime + 15s polling fallback
- Email via Resend SDK, API route at /api/email/send-scoring-link
- RESEND_API_KEY and RESEND_FROM_EMAIL configured in Vercel env vars
- Destructive actions (delete player/group) use amber/gold confirmation, NOT red

## Known Issues / Pre-Launch TODO
- [x] DELETE GROUP button is red — FIXED: all destructive buttons now use amber/gold
- [ ] Custom Resend domain needed before tournament day (currently onboarding@resend.dev, only delivers to verified account email)
- [ ] Leaderboard link on chaperone scoring success page
- [x] Tournament overview cards (Holes/Players/Groups) vertical alignment — FIXED: uses g4 grid with stretch