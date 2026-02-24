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
  │                       └── groups/page.tsx
  ├── (chaperone)/
  │   ├── layout.tsx
  │   └── score/[groupId]/page.tsx
  ├── register/
  │   └── [tournamentId]/
  │       └── page.tsx
  ├── api/
  │   └── auth/callback/route.ts
  └── leaderboard/
      └── page.tsx

## Completed
- [x] Sprint 0: Scaffolding — Next.js, Tailwind, Supabase client, auth, basic routing
- [x] Sprint 1: League setup, tournament creation, hole configuration
- [x] Sprint 2: Player management, parent registration, group pairings

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
