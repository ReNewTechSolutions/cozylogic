# CozyLogic (by ReNewTech Solutions)

CozyLogic is a calm, budget-aware room redesign app. Upload a room photo, choose a goal + style + budget (or “rearrange only”), and generate a refreshed concept with practical recommendations.

## Tech Stack
- Next.js (App Router)
- Supabase (Auth, Postgres, Storage)
- Tailwind CSS
- Vercel (deploy)

## Core Flow (MVP)
1. Create account / sign in
2. Start a redesign
3. Upload a room photo
4. Choose goal, style, and budget
5. Generate result
6. View before/after + recommendations
7. See history and manage account

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Server-only (never expose to browser)
SUPABASE_SERVICE_ROLE_KEY=...