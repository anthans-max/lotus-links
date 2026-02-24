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
  │   └── dashboard/page.tsx
  ├── (chaperone)/
  │   ├── layout.tsx
  │   └── score/[groupId]/page.tsx
  ├── api/
  │   └── auth/callback/route.ts
  └── leaderboard/
      └── page.tsx