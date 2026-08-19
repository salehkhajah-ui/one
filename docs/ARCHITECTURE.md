# ONE — Architecture

## Current shape (Milestone 1)

Mobile-first **Next.js (App Router) web app** deployed on Vercel. See `DECISIONS.md` #1 for why web-first instead of Expo/React Native for this milestone.

```
app/                    Next.js routes + UI components (React)
  components/           Shared UI (cards, nav, money text, charts)
  (tabs as routes)      / (Home), /plan, /grow, /goals, /one, /worth-it
lib/
  money.ts              Integer minor-unit Money utilities (pure TS)
  i18n.ts               Strings + locale-aware formatting (en now, ar-ready)
  engine/               DETERMINISTIC financial engine (pure TS, no React)
    types.ts            Domain types (FinancialProfile, Transaction, Goal, …)
    safeToSpend.ts      Safe-to-Spend calculation
    allocation.ts       Payday allocation waterfall
    emergency.ts        Emergency-fund stages
    goals.ts            Goal contribution / completion projection
    projection.ts       Compound growth projections
    score.ts            ONE Score components
    worthIt.ts          Purchase simulation
    insights.ts         Found-money / leak detection (deterministic)
    __tests__/          Vitest unit tests
  ai/
    provider.ts         AIProvider interface + tool contract
    mock.ts             MockAIProvider (rule-based, calls engine tools)
  demo/                 Demo Mode: Omar profile + seeded transaction generator
docs/                   Product/architecture/engine/security docs
```

## Hard boundaries

1. **Engine is pure.** `lib/engine/` and `lib/money.ts` import nothing from React, Next, or the DOM. They are candidates for extraction into `packages/financial-engine` (or reuse in React Native) without modification.
2. **AI explains, code calculates.** Data flow is always: `Financial Engine → structured numerical result → AI explanation layer → user-friendly text`. Never `LLM → invented numbers`. Chat answers come from controlled tool functions (`lib/ai/provider.ts`), never arbitrary data access.
3. **Money is integers.** All amounts are integer minor units (fils). Division uses explicit rounding; proportional splits use largest-remainder so totals stay exact.
4. **Providers are interfaces.** `AIProvider` (mock now, real LLM later behind env config) and `BankConnectionProvider` (demo/manual now, open-banking adapter later). UI code depends on interfaces only.

## State (Milestone 1)

Demo Mode is client-side: a `DemoProvider` React context seeds deterministic data and memoizes engine outputs. User adjustments (allocation sliders, chat) are local state. No network calls, no backend, no secrets.

## Planned (Milestones 2+)

- **Supabase**: Postgres + Auth + RLS on every user table; Edge Functions for server-side calculation where needed. Schema in `DATA_MODEL.md`.
- **TanStack Query** for server data once a backend exists; keep local state light.
- **Zod** at all external boundaries (forms, Edge Function inputs, AI structured outputs).
- **Analytics abstraction** (event names in `PRODUCT.md`) not coupled to a vendor.
- **i18n**: string tables namespaced from day one; layouts avoid RTL-breaking patterns (logical CSS properties, no direction-dependent absolutes).
- **Notifications, share cards, missions**: architecture reserved, not implemented.

## Performance & resilience

Derived financial summaries are memoized; no AI calls on render (mock provider is synchronous). Offline/stale data must be labeled ("Last updated …") once a backend exists. Errors are friendly with retry; technical detail goes to logs, not the user.
