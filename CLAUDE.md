# ONE — The Financial Moment Network

Three-sided rewards network: verified financial transactions (remittance first) instantly unlock personalized, **merchant-funded** rewards. ONE is rewards/marketing infrastructure — it never holds customer funds and never sees account details. See `docs/NETWORK.md` for architecture and the demo script.

## Persistent rules

- **TypeScript strict mode** everywhere. No `any` unless unavoidable and commented.
- **Money is integer minor units** (fils for KWD: 1.000 KD = 1000 fils). Never use floating-point arithmetic for balances or fees. Use `lib/money.ts`; never sprinkle manual `/1000` formatting in components.
- **All financial/dashboard numbers come from the deterministic engine** (`lib/network/` — engine, lifecycle, metrics). Components never invent or compute money; the engine is **pure TypeScript with no React/Next imports** (enforced by eslint `no-restricted-imports` on `lib/**`).
- **Privacy by design**: institution events carry hashed customer refs and amount *bands* — never names, accounts, exact amounts or beneficiary details. Keep it that way in every new event field.
- **Compliance posture**: ONE never holds/moves customer funds, never custodies money, never implies points are money. Demo merchants/institutions are labeled demo data; never imply a real partnership.
- **Tests required** for any change to `lib/money.ts` or `lib/network/`. Run `npm test`.
- Run `npm run typecheck && npm run lint && npm test && npm run build` before marking a task complete. Fix failures — don't report them as done.
- **The UI is bilingual (en/ar).** Arabic is Kuwaiti dialect (white colloquial), not MSA. Every user-visible string lives in `lib/i18n-strings.ts` as an `{ en, ar }` pair rendered via `t(key, params)` — never hard-code UI copy in components. The engine stays English (ids/messageKeys). Money always uses Latin digits (`.money` is LTR-isolated); use logical CSS (`ms-`/`me-`/`text-start`/`inset-inline-*`) so RTL flips for free.
- Tone: calm, premium, never judgmental, no hype, no guaranteed returns, no casino energy. The 4-click law: no primary workflow may exceed 3–4 interactions — redesign instead of adding steps.
- **Motion** lives inside the `prefers-reduced-motion: no-preference` block in `globals.css`; bar-growth transforms need the `[dir="rtl"]` origin override.

## Commands

- `npm run dev` — dev server
- `npm test` — engine unit tests (vitest)
- `npm run typecheck` — tsc --noEmit
- `npm run lint` — eslint
- `npm run build` — production build

## Current state

Demo milestone: the full three-sided vertical slice runs on-device (state in localStorage via `lib/network/storage.ts`, pure reducers in `lib/network/lifecycle.ts`). Surfaces: `/` landing, `/rewards` consumer app, `/merchant` (+ `/new`, `/scan`), `/institution`, `/admin`, `/investor`, `/pitch`, sandbox `POST /api/financial-events`. Production milestones (Postgres/Prisma, auth, webhooks, Shopify/POS) are mapped in `docs/NETWORK.md`.
