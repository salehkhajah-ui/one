# ONE — Product

**Brand:** Every dinar has a mind. / Every dinar knows where it should go.

ONE is an AI-powered money allocation system that helps ordinary people decide what every dinar they earn should do. It is not primarily a budgeting app, trading app, bank, stock picker, or expense tracker — those capabilities exist underneath. The consumer experience is:

> Money comes in. ONE understands my financial situation. ONE gives every dinar a job.

## Core problem

People see `Balance: 1,250 KD` and psychologically believe it is all available. They don't separate upcoming bills, daily expenses, emergency savings, debt, goals, investments, and discretionary money — so they overspend, save inconsistently, and delay investing. ONE converts a balance into purposeful money:

```
420 KD — Life · 180 KD — Bills · 150 KD — Protect · 250 KD — Grow · 150 KD — Goals · 100 KD — Enjoy
```

## Target user

18–35 in Kuwait/GCC: first-job employees, graduates, young professionals; people who struggle to save or are intimidated by investing. Primary currency **KWD (3 decimals — fils)**. Multi-currency and Arabic/RTL are architectural requirements from day one (English-first MVP).

## Product philosophy

Feels: simple, intelligent, calm, premium, encouraging, automatic.
Never feels: like accounting software, Bloomberg, a spreadsheet, gambling, a bank portal; never judgmental or childish.

## The six buckets

| Bucket | Purpose |
|---|---|
| **LIFE** | Necessary everyday expenses (food, transport, fuel, groceries, basics) |
| **BILLS** | Known upcoming obligations (rent, phone, internet, subscriptions, loans) |
| **PROTECT** | Emergency reserves and financial safety |
| **GROW** | Long-term investment allocation (simulated/recommended only in MVP) |
| **GOALS** | User-created future goals (travel, car, wedding, home, education) |
| **ENJOY** | Guilt-free discretionary money |

## Hero feature: Safe to Spend

A single daily number ("12.750 KD today") the user can spend while staying on track for bills, essentials, protection, goals, and planned growth. Recalculates when spending, income, or upcoming bills change. Spend less today → tomorrow may rise; overspend → future days fall.

## Key features (MVP scope)

- **Payday allocation** — income detected → recommended allocation across buckets, user can inspect/adjust/accept/regenerate. Accepting updates *virtual* allocation records only (no real fund movement — stated clearly in UI).
- **What-If / Worth It?** — enter item + price → affordability (without touching protected money), Safe-to-Spend impact, goal delay, growth impact, suggested timing, alternatives. Never shames the user.
- **Future Value / Future Me** — deterministic compound projections (conservative/base/optimistic) with visible assumptions and hypothetical-not-guaranteed labeling. Neutral framing: spending from Enjoy is a fine choice.
- **Money Leak Detector / ONE Found Money** — insights from transactions (subscription increases, duplicates, under-forecast spending) with "Give this money a job?" allocation.
- **ONE Score** — 0–100 financial *resilience* score (not a credit score) with transparent per-component formulas and a "best next move". Never manipulates users into investing to raise the score.
- **ONE Levels & Missions** — progression based on behavior, not wealth. No speculative trading challenges, no dark patterns.
- **Ask ONE** — chat that answers via controlled application functions (tools), never by querying data arbitrarily or inventing numbers.

## Navigation (5 tabs)

**HOME** (command center) · **PLAN** (allocation) · **GROW** (long-term/simulated growth) · **GOALS** · **ONE** (AI assistant).

## AI rules

AI explains; deterministic code calculates. Personality: concise, calm, encouraging, no hype, no promises of returns, no fear tactics. Every recommendation supports "Why?" with actual inputs shown. If data is insufficient, say so — never fabricate; estimates carry confidence levels.

## North star

Every product decision: *does this make it easier for an ordinary person to know what their money should do?* ONE never merely says "you have money" — it says what that money is for.

## Milestones

1. **Demo-mode vertical slice** (current): Home, Safe to Spend, buckets, allocation, goals, Grow projection, Worth It, ONE Score, Ask ONE (mock), realistic Kuwaiti demo data. No external dependencies.
2. Real user data: auth, onboarding, manual accounts/transactions, CSV import, persistence (Supabase), forecast.
3. Intelligence: classification, recurring detection, Money Leak insights, AI explanation layer, Ask ONE tools with real LLM.
4. External integrations: bank provider abstraction, secure tokens, sync, webhooks. No fake Kuwait banking claims.
