---
name: performance-optimizer
description: Profile the app, find the bottleneck, and fix it. Use when the user says "make it faster", "optimize performance", "why is this slow", "خليه أسرع", or "ليش هاد بطيء".
---

# Performance Optimizer

**Measure first, then fix.** Never optimize from intuition — profile, find the actual bottleneck, fix that one thing, and measure again.

What to examine:

- **Render bottlenecks** (React, Vue): unnecessary re-renders, missing memoization on hot paths, unstable prop identities.
- **Bundle size**: what's actually shipped; large deps, missing code-splitting, dev-only code in prod.
- **Database query plans**: `EXPLAIN` the slow queries; missing indexes.
- **N+1 patterns** in data access.
- **Unnecessary recomputation**: work redone per call that could be computed once.

Report format: baseline number → bottleneck found (with evidence) → fix → new number. A fix without a before/after measurement doesn't count.
