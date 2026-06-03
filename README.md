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
OPENAI_API_KEY=...

# Image generation
COZYLOGIC_IMAGE_MODEL=gpt-image-1
COZYLOGIC_IMAGE_MODEL_FALLBACK=gpt-image-1
COZYLOGIC_TEXT_MODEL=gpt-4.1-mini
```

### Image model configuration

`COZYLOGIC_IMAGE_MODEL` is the primary image model setting for both signed-in generation (`/api/generate`) and demo generation (`/api/demo/generate`). Set it in `.env.local` and in the deployment environment to switch image models without code changes.

`COZYLOGIC_IMAGE_MODEL_FALLBACK` is a server-side fallback value used only when `COZYLOGIC_IMAGE_MODEL` is unset. The legacy `OPENAI_IMAGE_MODEL` name is still read for compatibility, but new configuration should use `COZYLOGIC_IMAGE_MODEL`.

To test `gpt-image-2`, set `COZYLOGIC_IMAGE_MODEL=gpt-image-2` and keep a known-working fallback such as `COZYLOGIC_IMAGE_MODEL_FALLBACK=gpt-image-1` in the environment. The app uses the Image API edits endpoint for room photos and does not expose model names or API keys to client code.
