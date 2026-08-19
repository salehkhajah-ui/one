# ONE — Financial Engine

All formulas are deterministic TypeScript in `lib/engine/` (pure, no React). Money is integer minor units (fils). The LLM never calculates any of this. Engine version: `0.1.0`.

## Money (`lib/money.ts`)

- `fromMajor/toMajor` — conversion via per-currency `minorPerMajor` (KWD: 1000).
- `divideMinor(minor, n, mode)` — integer division with explicit rounding mode (default `floor`).
- `percentOf(minor, basisPoints)` — percentage in integer basis points (100 bps = 1%).
- `allocateProportionally(total, weights)` — **largest-remainder** split; parts always sum exactly to `total`.
- `formatMoney/formatAmount` — the only path from minor units to display strings (locale-aware `Intl`).

## Safe to Spend (`safeToSpend.ts`)

```
discretionary = max(0, availableCash − reservedBills − essentialsRemaining
                        − safetyBuffer − goalCommitments − plannedGrowth)
daily = floor(discretionary / max(1, daysUntilNextIncome))
```

- Daily is **floored** — under-promise rather than overdraw.
- `daysUntilNextIncome` clamps to ≥ 1 (payday today still shows a spendable number).
- If commitments exceed cash: `isConstrained = true`, `daily = 0`, `shortfall` reported. Never negative outputs.
- `safeToSpendAfterPurchase(input, price)` recomputes with reduced cash; commitments stay (that's the point of protected money).
- Future inputs reserved for v2: spending-pattern smoothing, weekend weighting, irregular income, uncertainty buffer.

## Emergency stages (`emergency.ts`)

Stage 1: 500 KD starter → Stage 2: 1× monthly essentials → Stage 3: 3× → Stage 4: user target (3–6+ months). Reports `monthsCovered`, current `stageTarget`, and `stageGap`. Suggested defaults, not guaranteed advice; the UI shows assumptions.

## Allocation waterfall (`allocation.ts`)

Order (spec §10), each step capped by what remains:

1. **Life** = `essentialMonthlyEstimate`
2. **Bills** = bills due before next payday + debt payments
3. **Protect** = `min(12% of income, emergency stage gap)` — stops entirely once the stage is covered
4. **Goals** = per-goal `requiredMonthly` (below); when budget is short, split by `allocateProportionally` weighted by priority (high 3 / medium 2 / low 1) × need
5. **Grow / Enjoy** = remainder split by risk preference — low 45/55, moderate 60/40, high 70/30 (largest-remainder, exact)

Invariant (tested): **items sum exactly to income**. Every item carries `reasonCode`, a human-readable `reason` containing the actual inputs, and a confidence level — this powers the "Why?" UI. Enjoy is deliberate: plans that leave no room for life don't last, so Enjoy is never zeroed while money remains after goals.

## Goals (`goals.ts`)

- `requiredMonthly = ceil(remaining / max(1, monthsToDeadline))`; open-ended goals default to a 24-month pace.
- Past-deadline goals are flagged `feasible: false` (never silently hidden).
- `projectGoalCompletion` converts monthly pace to a 30-day daily rate and projects the completion date; `onTrack` compares with the deadline with a 15-day grace (absorbs the 30-day-month approximation so a goal funded at its exact required pace is never flagged as behind).
- `goalDelayDays(monthlyPace, diverted) = ceil(diverted / (monthlyPace / 30))`.

## Compound projections (`projection.ts`)

Scenarios: Conservative 3% · Base 6% · Optimistic 9% annual, compounded monthly.

```
FV = P·(1+r)^n + C·((1+r)^n − 1)/r      (r = annual/12, n = months)
```

Floating point is permitted **only** here (hypothetical projection, not a balance), rounded once at the end. Every result returns its assumptions: hypothetical, inflation excluded, not guaranteed, investments can lose value, ONE does not execute investments. UI must display them.

## Cash-flow forecast (`forecast.ts`)

Day-by-day balance projection over 30 days (max 90): salary lands on payday, each active recurring bill on its expected day-of-month, and a daily spending run-rate subtracts every day. Run-rate: with history, the average daily **non-recurring** debit over the last 30 days (bills counted separately to avoid double-counting); without history, (essentials + Enjoy pace) ÷ 30. Reports the minimum point and the **first day below the user's cash buffer** (`firstBelowBufferISO`), which powers the low-cash warning. Balances may go negative and are reported honestly. A projection, not a promise — the basis string is surfaced in the UI.

## ONE Score (`score.ts`)

0–100 resilience (NOT a credit score). Weights: Emergency 30 · Cash Flow 25 · Growth 20 · Goals 25.

| Component | Formula (each clamped 0–100) |
|---|---|
| Emergency | months of essentials covered ÷ 3 × 100 |
| Cash Flow | savings rate over lookback ÷ 20% benchmark × 100 |
| Growth | Grow allocation as % of income ÷ 10% benchmark × 100 |
| Goals | average completion % of active goals |

`bestNextMove` prioritizes safety: Protect gap first, then cash flow, then goals, then (only when safety is covered) growth. The score never pushes investing over safety.

## Worth It? (`worthIt.ts`)

- Affordability tiers: within Enjoy → within discretionary (Safe to Spend pool) → would touch protected money.
- Shortfall beyond Enjoy is attributed proportionally to Goal vs Grow monthly paces → goal delay days + grow reduction.
- Timing: suggests next payday when fresh Enjoy would cover it; otherwise a save-up horizon `ceil(shortfall / monthlyEnjoy)` months (≤ 6 months shown as a date).
- Language is neutral by contract — tests assert no shaming vocabulary.

## Insights (`insights.ts`)

- **Found money**: `expected − actual` category spend over a window, gated by a threshold; medium confidence (history-based estimate).
- **Subscription increase**: same normalized recurring merchant, later charge > earlier charge → monthly/annual impact with supporting transaction IDs.
- **Give it a job**: found money split Protect/Grow/Goal/Enjoy = 31/47/16/6 (40/50/–/10 without a goal) via largest-remainder.
- No fake warnings: stable data produces no insights (tested).

## Testing

81 unit tests (`lib/engine/__tests__/`) cover: zero income, zero balance, negative cash flow, payday today/tomorrow/30 days, large bills, overspending, missing history, high/low emergency funds, multiple goals, impossible deadlines, rounding, KWD 3-decimal precision, allocation sum invariants, no-shame language, score bounds. Run `npm test`.
