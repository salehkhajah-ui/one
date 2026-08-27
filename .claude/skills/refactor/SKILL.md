---
name: refactor
description: Rewrite messy parts of the codebase into clean, modular code without changing behavior. Use when the user says "refactor this", "clean this up", "make it modular", "pull this logic out", "اعمل refactor", "نضّف هاد", or "اسحب هاد الـ logic برا".
---

# Refactor

Take the messy part the user points at and rewrite it clean and modular — **without changing behavior**.

Patterns to reach for:

- Extract function / extract module.
- Replace conditionals with polymorphism.
- Introduce parameter object.
- Break up god classes.
- Pull pure logic away from code full of side effects.

Rules:
- Behavior-preserving means test-verified: run the existing tests before and after; if the area has no tests, write a characterization test first.
- Refactor in small, reviewable steps; don't mix refactoring with feature changes in one commit.
- In this repo, pure logic belongs in `lib/` (the engine stays free of React/Next imports); run `npm test` after touching `lib/money.ts` or `lib/engine/`.
