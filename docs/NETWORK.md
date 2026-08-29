# ONE — The Financial Moment Network

The rewards-network vertical slice: verified financial transactions (starting
with remittances) instantly unlock personalized, **merchant-funded** rewards.
ONE is rewards/marketing infrastructure — it never holds customer funds,
never touches the transfer itself, and never sees account details. Licensed
institutions send privacy-minimized events; ONE matches, issues, redeems and
attributes.

```
FINANCIAL EVENT → INTELLIGENT REWARD → REDEMPTION → MEASURABLE SALE
```

## Surfaces

| Route | Surface |
| --- | --- |
| `/` | Landing — the three-sided story + 60-second demo script |
| `/rewards` (+ `/reveal`, `/wallet`, `/discover`, `/profile`) | Consumer app (phone shell, 4 tabs) |
| `/merchant` (+ `/new`, `/scan`) | Merchant portal: dashboard, 4-step campaign creator, code scanner |
| `/institution` | Institution portal: leverage stats, event simulator, mode/policy controls, developer card |
| `/admin` | ONE admin: platform revenue, fraud signals, merchant approvals, analytics ledger |
| `/investor` | Investor mode + interactive unit-economics simulator |
| `/pitch` | 10s / 30s / 60s pitches, merchant pitch (+ ROI calculator), institution pitch |
| `POST /api/financial-events` | Sandbox integration endpoint (stateless; see below) |

This is the standalone repo of the network product (extracted from the
combined ONE repo); `lib/network/paths.ts` only decides shell width
(phone for the consumer app, wide for portals).

## Engine (`lib/network/`, pure TypeScript)

- **`types.ts`** — the entity model: `FinancialEvent`, `Institution`,
  `Merchant`, `Campaign`, `Moment`, `RewardInstance`, `Redemption`,
  `FraudSignal`, `LedgerEntry`, `ConsumerProfile`, baselines. These shapes map
  1:1 onto the future Postgres schema (see below).
- **`engine.ts`** — the reward auction. Hard eligibility gate (status, budget,
  merchant approval, institution category blocks, event type, amount band,
  market/corridor, day-of-week, per-customer cap, audience) then ecosystem
  scoring: `relevance × predicted redemption × merchant economic value ×
  reward attractiveness`. Deliberately not highest-bidder-wins.
- **`lifecycle.ts`** — pure reducers: `ingestEvent` (validation, transaction-id
  dedupe, 60s velocity limit) → `revealMoment` → `selectReward` (BOTH WIN
  issues sender + recipient instances; preference vector learns) →
  `redeemByCode` (single-use codes; reuse/expiry rejected and logged) →
  `refundRedemption` / `reverseEvent` / `expireSweep`. Campaign management +
  institution configuration + merchant approval live here too. Every
  transition appends to the analytics ledger.
- **`metrics.ts`** — every dashboard number: merchant funnel/ROI/CPA,
  institution leverage (merchant-funded value vs SaaS cost), platform revenue.
  Ratios in basis points, money in integer fils; components never do math.
- **`seed.ts`** — demo cast (all `demo: true`, labeled in the UI): Tropicfeel,
  Orbit Coffee, Shore Kitchen, Diwan Market, Halo Telecom, Nomad Travel,
  Marquee Cinema, SariSari Mart (PH) + "ONE Exchange" demo institution + nine
  campaigns covering CPR/CPA/CPS pricing, premium bands, slow days, recipient
  market and BOTH WIN, plus a 14-day activity baseline so dashboards are alive
  on first open.
- **`storage.ts`** — localStorage persistence (`one.network.v1`).

Reward modes (institution-configurable): **A** one reward (`single`), **B**
choice of 3 (`choice`, default), **C** `surprise`, **D** `boosted` (base +
upgrade — architecture present, experience TBD).

Tiers (ONE → Silver → Gold → Black) progress with *engagement counts only*,
never transfer size — no incentive to remit irresponsibly.

## Integration contract (sandbox)

`POST /api/financial-events` validates and runs the auction against the seeded
network (stateless — the interactive demo state lives client-side in this
milestone):

```json
{
  "event_type": "remittance_completed",
  "institution_id": "inst_onex",
  "customer_ref": "cst_9f3a7c1e",
  "transaction_id": "TX123456",
  "amount_band": "100_250",
  "country": "KW",
  "destination_country": "PH"
}
```

Response: `{ event_id, status, reward_mode, candidates: [{campaign_id,
merchant, reward, market, score}], sandbox: true }`. Rejections return the
machine-readable reason (`duplicate_transaction`, `velocity_limit`,
`unknown_institution`). Privacy by design: hashed `customer_ref`, amount
**bands** not amounts, no names/accounts/beneficiary details, ever.
Production adds API keys, webhook signatures, retries and idempotency keys.

## The 60-second demo

1. `/institution` → **Send event** (watch it accepted with candidates; try
   **Send duplicate** to see the fraud rejection, **Reverse last** to see
   cancellation).
2. `/rewards` → banner **You unlocked something** → **Reveal** → pick a reward
   (or *Take both* on the BOTH WIN card, or gift it to the recipient).
3. `/rewards/wallet` → open the ticket → copy the 6-char single-use code.
4. `/merchant/scan` → enter code + purchase amount → **Redeem** (try it twice:
   the second attempt is declined and logged as a fraud signal).
5. `/merchant` → today's customers, revenue, spend and ROI moved; `/admin`
   shows the billed fee, ledger entries and any fraud signals.

Everything runs on-device against seeded demo data — no real integrations, no
real money, and demo merchants are labeled as such.

## Production mapping (next milestones)

- Entities → Postgres via Prisma (`Users`, `Merchants`, `FinancialInstitutions`,
  `FinancialEvents`, `RewardCampaigns`, `RewardInstances`, `RewardRedemptions`,
  `Attributions`, `Budgets`, `Invoices`, `FraudSignals`, `AuditLogs`,
  `WebhookEvents`, `APIKeys`, `Referrals`, `RecipientRewards`, …) — the demo
  state shapes were designed as that schema.
- The client store's reducers become service-layer transactions; the ledger
  becomes the event-analytics stream; Redis for frequency caps and velocity;
  BullMQ for expiry sweeps, webhooks and settlement.
- Auth (passwordless), role-based access per portal, Shopify + POS
  integrations, real QR (the code display already isolates the credential from
  the decorative matrix).
- Uplift/optimization models operate only within merchant-approved reward
  ranges (`updateCampaignReward` is already approval-gated in the copilot UX).

## Testing

`lib/network/__tests__/network.test.ts` (22 tests) covers the master-spec
critical flows: ingestion + dedupe + velocity, auction gates (bands, category
blocks, recipient policy), consumer select/redeem, single-use code reuse
rejection, CPS/CPR/CPA billing, refund unwinding, reversal cancellation,
budget exhaustion, BOTH WIN, recipient market issuance, metrics movement and
tier progression. Run with `npm test`.
