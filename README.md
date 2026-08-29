# ONE — Every dinar has a mind

AI-powered money allocation for ordinary people: ONE converts a bank balance into purposeful money — Safe to Spend, bills, protection, goals and long-term growth. Built KWD-first (3-decimal fils), architected for multi-currency and Arabic/RTL.

**Live demo:** deployed automatically to Vercel from `main`. Open it on a phone — the app is phone-shaped.

## What's inside (Milestone 1)

- **Deterministic financial engine** (`lib/engine/`) — pure TypeScript, no React: Safe to Spend, payday allocation waterfall, emergency stages, goal pacing, compound projections, ONE Score, Worth It? simulation, money insights. 95 unit tests. All money is integer fils.
- **Demo Mode** (`lib/demo/`) — seeded, realistic Kuwaiti data (Omar, 24 · salary 1,200 KD · payday 25th · 4 months of transactions). Every screen works with zero external services.
- **Mock AI layer** (`lib/ai/`) — `AIProvider` interface + rule-based mock that answers chat questions from real engine functions. The AI explains; it never calculates.
- **Five screens** — Home (Safe to Spend hero, buckets, insight, ONE Score), Plan (adjustable allocation with live consequences), Grow (hypothetical projections), Goals, Ask ONE — plus Worth It?.

Docs: [`docs/PRODUCT.md`](docs/PRODUCT.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/FINANCIAL_ENGINE.md`](docs/FINANCIAL_ENGINE.md) · [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) · [`docs/SECURITY.md`](docs/SECURITY.md) · [`docs/ROADMAP.md`](docs/ROADMAP.md) · [`docs/DECISIONS.md`](docs/DECISIONS.md)

## The Financial Moment Network

The repo also carries ONE's second product — a three-sided rewards network
where verified financial transactions (remittance first) instantly unlock
personalized, **merchant-funded** rewards. Start at **`/network`**:

- **`/rewards`** — consumer app: simulate a transfer, reveal, choose (incl.
  BOTH WIN and gift-to-recipient), wallet with single-use codes.
- **`/merchant`** — dashboard with live ROI/attribution, 4-step campaign
  creator (+ AI generator), code scanner (`/merchant/scan`).
- **`/institution`** — leverage stats, event simulator (incl. duplicate/fraud
  and reversal tests), reward-mode and recipient-policy controls.
- **`/admin`**, **`/investor`** (unit-economics simulator), **`/pitch`**
  (10/30/60s + merchant + institution pitches), `POST /api/financial-events`
  sandbox.

Engine in `lib/network/` (pure TS, tested), full docs in
[`docs/NETWORK.md`](docs/NETWORK.md). Everything is seeded demo data — no real
integrations, no real money, and ONE never holds funds.

## Local setup

Requires Node 20+.

```bash
git clone https://github.com/salehkhajah-ui/one.git
cd one
npm install
npm run dev        # http://localhost:3000
```

Quality gates (run all before committing):

```bash
npm test           # financial engine unit tests (vitest)
npm run typecheck  # strict TypeScript
npm run lint       # eslint (incl. engine-purity rule: lib/ can't import React/Next)
npm run build      # production build
```

## Ground rules

- Money is **integer minor units** (1.000 KD = 1000 fils) — never floating point for balances.
- Every number on screen comes from the deterministic engine; the AI layer only explains.
- No real-money securities execution; projections are labeled hypothetical.
- No secrets in the repo — providers (AI, banking) live behind interfaces with mock/demo implementations.

See `CLAUDE.md` for the full working agreement.
