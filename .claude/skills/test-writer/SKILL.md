---
name: test-writer
description: Write unit and integration tests for any function or module, with real assertions and edge-case coverage. Use when the user says "write tests for", "cover this with tests", "add unit tests", "اكتب tests لـ", or "غطّي هاد بـ tests".
---

# Test Writer

Write unit + integration tests for whatever function or module the user points at.

- Generate **real assertions** — never `expect(true).toBe(true)` or snapshot-everything laziness.
- Cover the **edge cases the author would forget**: empty input, zero, negative, boundary values, unicode/RTL text, concurrent calls where relevant.
- Name tests by behavior ("carries remainder fils to the last bucket"), not by method name.
- Test the public contract, not private internals.
- Run the suite and make it pass before declaring done.

Project notes (ONE app):
- Test runner is **vitest** (`npm test`).
- Tests are **required** for any change to `lib/money.ts` or `lib/engine/` — money math uses integer fils, so assert exact integers, never float comparisons.
