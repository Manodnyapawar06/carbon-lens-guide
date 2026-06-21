# 🌿 CarbonLens

A personal carbon footprint tracker that helps individuals understand, track, and reduce their environmental impact through simple actions and AI-powered insights.

> **Live demo:** https://carbon-lens-guide.lovable.app

## Overview

CarbonLens makes climate action personal. Log your daily activities — meals, commutes, energy use, flights, shopping — and see a clear picture of your monthly carbon footprint. Gamified streaks, achievement badges, and an AI Insights Center turn awareness into measurable change.

## Features

- 🔐 **Auth** — Email/password and Google OAuth, with password reset.
- 🧭 **Onboarding** — Quick profile quiz (diet, transport, energy source, flights) sets a personalized baseline.
- 📊 **Dashboard** — Sustainability Score, streaks, monthly goal progress, and a *smart* impact forecast that smooths spikes and uses 7–30 days of history.
- ✍️ **Activity Logger** — Categorized presets (transport, food, energy, travel, shopping) with kg CO₂ computed instantly.
- 📈 **Trends** — Category breakdowns, weekly/monthly totals, and daily performance charts (Recharts).
- 🤖 **AI Insights** — Personalized weekly recommendations and 3 actionable "Quick Wins" with estimated CO₂ savings, generated via the Lovable AI gateway.
- 🏆 **Achievements** — Unlockable badges (First Log, 7-Day Streak, Eco Beginner, Carbon Saver, Green Week, Sustainability Champion) with criteria and earned dates.
- ♿ **Accessible & responsive** — Mobile-first, keyboard navigable, semantic HTML, ARIA labels on icon-only controls.

## Tech Stack

- **Frontend:** React 19, TanStack Start (file-based routing + SSR), Tailwind CSS v4, shadcn/ui
- **Charts:** Recharts
- **State/Data:** TanStack Query
- **Backend:** Lovable Cloud (Postgres + Auth + Server Functions) with Row-Level Security
- **AI:** Lovable AI Gateway (Gemini) via TanStack `createServerFn`
- **Testing:** Vitest + React Testing Library + jsdom
- **Tooling:** TypeScript (strict), ESLint, Prettier

## Project Structure

```
src/
  routes/            # File-based TanStack routes (public + _authenticated)
  components/        # App shell + shadcn/ui primitives
  lib/
    emissions.ts     # Categories, presets, kg CO₂ factors
    scoring.ts       # Sustainability score, forecast, streaks, achievements
    insights.functions.ts  # AI server function (Lovable AI)
  integrations/supabase/   # Auth & DB clients (auto-generated)
supabase/migrations/       # SQL: profiles, activities, goals, RLS, grants
tests/                     # Vitest unit tests
```

## Installation

```bash
# 1. Clone
git clone <your-fork-url>
cd carbonlens

# 2. Install deps (Bun recommended; npm/pnpm also work)
bun install

# 3. Environment
cp .env.example .env  # fill in Supabase URL + publishable key

# 4. Dev
bun run dev           # http://localhost:8080
```

### Useful scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Start the Vite dev server |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run test` | Run the Vitest test suite once |
| `bun run test:watch` | Vitest in watch mode |
| `bun run test:coverage` | Coverage report |

## Testing

Unit tests live in `/tests` and cover the core domain logic:

- `emissions.test.ts` — preset integrity and CO₂ calculations
- `scoring.test.ts` — sustainability score, category totals, forecast smoothing, streaks, and achievement unlocks

```bash
bun run test
```

## Deployment

Deployed on Lovable Cloud.

- **Live app:** https://carbon-lens-guide.lovable.app
- **Preview:** https://id-preview--9ab8aad5-284f-49e1-8488-317f817d9c87.lovable.app

## Security

- Supabase Row-Level Security is enabled on every `public.*` table with explicit GRANTs scoped to `authenticated` (and `service_role` for server code).
- Roles are stored in a dedicated `user_roles` table and checked through a `security definer` `has_role()` function — never on the profile row.
- All form inputs are validated client-side with `zod` / native HTML constraints and again by Postgres column types and RLS.
- Authenticated routes are protected by a `_authenticated` layout that calls `supabase.auth.getUser()` in `beforeLoad` and redirects to `/auth`.

## GitHub

Source: <add your GitHub repository URL here>

## License

MIT
