# ONE — AI Money Allocation Platform

Consumer fintech app: every dinar gets a job. See `docs/PRODUCT.md` for full product spec.

## Persistent rules

- **TypeScript strict mode** everywhere. No `any` unless unavoidable and commented.
- **Money is integer minor units** (fils for KWD: 1.000 KD = 1000 fils). Never use floating-point arithmetic for balances. Use `lib/money.ts` utilities; never sprinkle manual `/1000` formatting in components.
- **All financial numbers come from the deterministic engine** (`lib/engine/`). The AI layer explains; it never calculates, invents balances, or performs arithmetic from prose.
- The engine is **pure TypeScript with no React/Next dependencies** so it can move to a package or React Native app later.
- **No real-money securities execution** in this MVP. Growth/investing is simulated and clearly labeled hypothetical.
- **Never commit secrets.** AI/bank providers are configured via environment variables behind interfaces (`AIProvider`, `BankConnectionProvider`) with mock/demo implementations.
- **Tests required** for any change to `lib/money.ts` or `lib/engine/`. Run `npm test` after engine changes.
- Run `npm run typecheck && npm run lint && npm test && npm run build` before marking a task complete. Fix failures — don't report them as done.
- Update `docs/` when architecture or formulas change (`FINANCIAL_ENGINE.md` for formulas, `DECISIONS.md` for architecture decisions).
- Follow existing component patterns in `app/components/`. Prefer maintainable code over clever abstractions.
- Currency/locale formatting goes through `lib/money.ts` / `lib/i18n.ts` — never hard-code "KD" strings in components.
- **The UI is bilingual (en/ar).** The Arabic is Kuwaiti dialect (white colloquial), not MSA — keep new strings in the same voice (the privacy policy alone stays MSA). Every user-visible string lives in `lib/i18n-strings.ts` as an `{ en, ar }` pair and renders via `t(key, params)` — never hard-code UI copy in components. Engine-derived sentences are rebuilt from `reasonCode`/`meta` in `app/components/text.ts`; the engine itself stays English (DECISIONS.md #10). Money always uses Latin digits (`.money` is LTR-isolated); use logical CSS (`ms-`/`me-`/`text-start`/`inset-inline-*`) so RTL flips for free, and wrap time-axis charts in `dir="ltr"`.
- Tone in all user-facing copy: calm, encouraging, never judgmental, no hype, no guaranteed returns.

## Commands

- `npm run dev` — dev server
- `npm test` — engine unit tests (vitest)
- `npm run typecheck` — tsc --noEmit
- `npm run lint` — eslint
- `npm run build` — production build

## Current state

Milestone 1.5: mobile-first **web app** (deploys to Vercel) with the demo vertical slice PLUS onboarding, manual mode (user's own numbers, localStorage persistence via `lib/app/storage.ts`), and the Payday experience. State builds in `lib/app/state.ts` from a `DataBundle` (demo or manual). React Native and Supabase are future milestones; see `docs/DECISIONS.md`.
