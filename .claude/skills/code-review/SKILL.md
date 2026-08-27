---
name: code-review
description: Review code for bugs, security issues, and performance problems. Use when the user says "review this code", "audit the codebase", "look for bugs", "check security", "راجع الكود", "دوّر على أخطاء", or "افحص الأمان".
---

# Code Review

When reviewing any code, work through these axes in order:

## Security
- SQL injection, leaked secrets, auth gaps.

## Performance
- N+1 queries, unnecessary re-renders, memory leaks.

## Correctness
- Race conditions, edge cases, error handling.

## Maintainability
- Duplication, naming, complexity.

For every finding: point to the exact line, explain the risk, and propose the alternative.

Project notes (ONE app):
- Money must be integer minor units (fils) via `lib/money.ts` — flag any floating-point arithmetic on balances or manual `/1000` formatting.
- All financial numbers must come from the deterministic engine (`lib/engine/`, pure TS, no React/Next imports) — flag AI-layer code that calculates.
- Flag hard-coded user-visible strings; they belong in `lib/i18n-strings.ts`.
