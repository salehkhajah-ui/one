# ONE — The Financial Moment Network

Every transaction creates an opportunity. ONE connects exchanges, banks and fintechs with merchants so that every verified financial transaction — a remittance first of all — instantly unlocks a personalized, **merchant-funded** reward. Merchants pay for measurable customers, not clicks; institutions get loyalty they don't fund; consumers get rewarded for transactions they already make.

ONE is rewards/marketing infrastructure: it never holds customer funds, never touches the transfer, and never sees account details (hashed refs + amount bands only).

```
FINANCIAL EVENT → INTELLIGENT REWARD → REDEMPTION → MEASURABLE SALE
```

## Surfaces

| Route | What it is |
| --- | --- |
| `/` | Landing — the three-sided story + the 60-second demo script |
| `/rewards` | Consumer app — reveal, wallet with single-use codes, discover, profile |
| `/merchant` | Merchant portal — ROI/attribution dashboard, 4-step campaign creator (`/new`), code scanner (`/scan`) |
| `/institution` | Institution portal — leverage stats, event simulator, reward-mode + recipient-policy controls |
| `/admin` | ONE admin — revenue, fraud signals, approvals, analytics ledger |
| `/investor` | Investor mode + unit-economics simulator |
| `/pitch` | 10/30/60-second pitches, merchant pitch + ROI calculator, institution pitch |
| `POST /api/financial-events` | Sandbox integration endpoint |

Fully bilingual (English + Kuwaiti Arabic, RTL). The whole demo runs on-device against seeded demo data — no real integrations, no real money, and demo merchants are labeled as such.

## The 60-second demo

1. `/institution` → **Send event** (try **Send duplicate** for the fraud rejection, **Reverse last** for cancellation).
2. `/rewards` → **You unlocked something** → **Reveal** → pick a reward (or *Take both* on the BOTH WIN card, or gift it to the recipient).
3. `/rewards/wallet` → open the ticket → copy the 6-character single-use code.
4. `/merchant/scan` → enter the code + purchase amount → **Redeem** (a second attempt is declined and logged).
5. `/merchant` → customers, revenue, spend and ROI moved; `/admin` shows the billed fee, ledger and fraud signals.

## Setup

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Quality gates (all must pass before committing):

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Architecture

Pure-TypeScript engine in `lib/network/` (no React/Next imports, enforced by lint): event ingestion with dedupe + velocity limits, an ecosystem-scored reward auction, reward modes A–D, single-use redemption codes, CPR/CPA/CPS billing, refunds/reversals, BOTH WIN + recipient-market rewards, preference learning, engagement tiers, fraud signals and an append-only analytics ledger. Money is integer fils everywhere (`lib/money.ts`).

Full docs: [`docs/NETWORK.md`](docs/NETWORK.md) — engine internals, integration contract, privacy/compliance posture, and the production (Postgres/Prisma) mapping. Project rules for contributors and agents: [`CLAUDE.md`](CLAUDE.md).
