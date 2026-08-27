---
name: type-safety
description: Remove `any` from the codebase and add real TypeScript types where they're missing. Use when the user says "add types", "fix TypeScript", "make it strict mode", "ضيف types", or "صلّح TypeScript".
---

# Type Safety

Most TS projects are ~30% `any`. Close that gap so the types actually catch bugs.

Steps:

1. Find the `any`s: explicit `any`, implicit `any` (untyped params), `as any` casts, and `@ts-ignore`/`@ts-expect-error` suppressions.
2. Replace each with the **real type**: derive from usage, use `unknown` + narrowing at trust boundaries (API responses, JSON.parse), generics where the shape flows through.
3. Prefer discriminated unions over optional-field soup; `satisfies` over lossy `as`.
4. Turn on / keep **strict mode** and fix what it surfaces rather than suppressing it.
5. Run `npm run typecheck` — done means zero errors, not fewer errors.

Project note: this repo is already strict everywhere; `any` is allowed only when unavoidable **and commented** (CLAUDE.md).
