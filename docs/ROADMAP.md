# ONE — Roadmap

## Milestone 1 — Demo-mode vertical slice ✅ (current)

Launch → Demo user (Omar) → Home with Safe to Spend → six money buckets → allocation recommendation with adjustable amounts and visible consequences → Goals with progress/ETA → Grow projections (hypothetical, labeled) → Worth It? simulator → ONE Score → Ask ONE with mock provider answering from real engine functions. Realistic seeded Kuwaiti data (salary 1,200 KD, payday 25th, 4 months of transactions). No external dependencies.

## Milestone 1.5 — Personal & complete loop ✅

- First-run choice: **Try the demo** or **Build my ONE plan**
- Full onboarding (income → payday → essentials → bills → protection → goals → growth → generate → plan) writing a real local profile
- **Manual mode**: the whole app runs on the user's own numbers, honest about missing history (no fabricated insights; plan-based score basis; medium-confidence Safe to Spend)
- **Payday experience**: income lands → dinars get to work → every dinar has a job → Accept/Adjust
- Accepted plans persist per pay cycle (virtual allocations, local storage) and drive Safe to Spend/buckets until payday
- Local persistence layer (`lib/app/storage.ts`) mirroring the Supabase data model for a clean Milestone 2 swap

## Milestone 1.6 — Live feedback loop ✅

- Record spending/income (`/add`): amount, merchant, category chips; saved locally in both modes
- Balances and **Safe to Spend recalculate instantly** on every recorded transaction (verified end-to-end)
- Activity screen (`/activity`): day-grouped history, month in/out summary, delete for user-added entries
- Home hero gains quick actions (Record spending · Worth it?)

## Milestone 1.7 — Bank-message ingestion ✅

- Deterministic Kuwait bank SMS/notification parser (EN + AR, confidence-labeled, never invents transactions)
- Paste-to-import on `/add` with parsed preview and explicit confirmation
- PWA manifest + share target: installed ONE appears in the Android share sheet — share a bank alert straight in
- Path to full auto-read documented in `DECISIONS.md` #6 (native Android listener → same parser; iOS via future bank APIs)

## Milestone 2 — Real user data

- Supabase: Postgres, Auth (email + OTP/magic link; Apple/Google later), RLS everywhere
- Onboarding flow (10 screens per PRODUCT spec) writing a real `financial_profiles` row
- Manual accounts + manual transactions; CSV import
- Persistent goals, allocations, contributions
- ~~Cash-flow forecast (30-day projected balance, low-cash warnings)~~ ✅ shipped early (Home "Next 30 days" card)
- ONE Score history
- Data export + account deletion

## Milestone 3 — Intelligence

- Deterministic merchant rules → transaction categorization; user corrections become rules
- Recurring-transaction detection (merchant/amount/interval similarity) powering forecast
- Money Leak insights (duplicates, price increases, unused subscriptions) as `insights` rows
- Cash-flow anomaly detection
- Real `AIProvider` implementation behind env config: explanation layer + Ask ONE tools (structured JSON only), optional AI classification fallback with stored confidence

## Milestone 4 — External integrations

- `BankConnectionProvider` real adapter (verified provider only — never fake Kuwait bank connectivity)
- Secure token architecture, sync jobs, webhooks
- Notification architecture (payday, Safe-to-Spend change, bill approaching, goal milestone, leak found) — value-first, no spam
- Share cards (percentages only; never salary/balance/net-worth without explicit choice)

## Later / vision

ONE Levels + Money Missions, streaks (no dark patterns), Arabic + RTL, multi-currency, regulated-provider investing abstraction, ONE Family/Travel/Life expansions. Money is the wedge; keep the MVP unpolluted.
