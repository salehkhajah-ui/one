# Architecture Decisions

## 1. Web-first (Next.js) instead of Expo/React Native for Milestone 1

**Date:** 2026-08-19 · **Status:** accepted

The spec suggests React Native + Expo "unless repository constraints suggest otherwise". Constraints that decided this:

- The repository is an existing Next.js app with a working GitHub → Vercel auto-deploy pipeline; every push is instantly testable on any phone via URL — no emulator/TestFlight loop for a non-technical founder.
- The Vercel project's build settings (root directory) cannot be changed with current integration access, so the Next.js app must remain at the repo root; an Expo app would not deploy here at all.
- The financial engine and money utilities are pure TypeScript with zero React/DOM imports, so a future React Native app reuses them unchanged. UI is the only rewrite surface, and screens are deliberately phone-shaped.

**Revisit when:** app-store presence, push notifications, or secure device storage become requirements (Milestone 4 era).

## 2. Single app with `lib/` modules instead of npm-workspaces monorepo

**Status:** accepted

Workspaces (`apps/mobile`, `packages/financial-engine`) add build/config surface without present benefit and would require moving the Next.js app out of the repo root (blocked — see #1). Instead the package boundary is enforced by convention and lint: `lib/engine/` + `lib/money.ts` import nothing from React/Next. Extract into a real package when a second app exists.

## 3. Money as integer minor units (fils)

**Status:** accepted

All amounts are integers (1.000 KD = 1000 fils). Floating point is never used for balance arithmetic. Splits use largest-remainder allocation so bucket sums exactly equal income. Currency metadata (minor-per-major, decimals) lives in one table in `lib/money.ts` so other currencies slot in later.

## 4. Deterministic engine, mock AI

**Status:** accepted

Every number on screen comes from `lib/engine/` pure functions with unit tests. The chat ("Ask ONE") uses `MockAIProvider` — intent matching that calls the same engine functions and formats results. A real LLM provider will implement the same `AIProvider` interface behind env config; it will receive engine outputs and produce language, never numbers.

## 5. Local persistence before backend (Milestone 1.5)

**Status:** accepted

Onboarding and accepted payday plans persist to `localStorage` behind `lib/app/storage.ts`, whose shapes mirror `DATA_MODEL.md`. Rationale: prove the personal product loop (onboard → allocate → accept → live by Safe to Spend) with real user numbers before paying the cost of auth/RLS/backend. Milestone 2 replaces the storage calls with Supabase without touching the state builder or UI. Manual mode is honest about its limits: no transaction history → no insights, plan-based score basis, medium-confidence Safe to Spend.

## 6. Bank-notification ingestion: parser + share sheet now, native listener later

**Status:** accepted

Goal: numbers adjust from real bank alerts. Platform reality: web apps cannot read device notifications; iOS forbids reading other apps' notifications entirely; Android allows it only for a native app holding the user-granted Notification-access permission.

Strategy in three layers, all feeding one deterministic parser (`lib/app/bankParser.ts` — Kuwait bank SMS formats, English + Arabic, unit-tested, never invents a transaction and labels its confidence):

1. **Now (web):** paste a bank message into `/add` → parsed preview → user confirms → balances and Safe to Spend adjust. Message text never leaves the device.
2. **Now (Android, 2 taps):** PWA `share_target` — install ONE to the home screen, then Share → ONE from any bank SMS/notification lands pre-parsed in `/add`.
3. **Later (native Android companion):** a NotificationListenerService feeds the same parser automatically; iOS instead waits for real bank/API integration (Milestone 4).

Auto-commit is deliberately off: parsed transactions require a confirmation tap (trust, and Play-policy hygiene for the future native app).

## 7. Demo Mode is seeded and date-anchored

**Status:** accepted

Demo data generates from a fixed seed relative to "today" so paydays/bills fall realistically around the current date, while remaining deterministic within a day. No network, no external APIs; every major screen works offline.
