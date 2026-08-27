---
name: database-architect
description: Design database schemas, indexes, and migrations, catching normalization mistakes before they cost you in production. Use when the user says "design the schema", "write a migration", "model this data", "صمّم الـ schema", or "نمذج هالبيانات".
---

# Database Architect

Covers Postgres, MySQL, SQLite, and MongoDB. Deliver:

- A **schema** with explicit types, constraints, and **foreign-key relationships** — catch normalization mistakes (repeated groups, multi-fact columns, missing junction tables) at design time.
- **Migration files with both `up` and `down`**, safe to run on live data (additive first; backfill; then constrain).
- An **index strategy built from the actual query patterns**, not guesses — one index per hot query shape, and justify each.

Rules:
- Money columns are integer minor units (fils for KWD), never `FLOAT`/`DECIMAL` arithmetic in app code.
- Timestamps in UTC (`timestamptz` in Postgres).
- In this repo Supabase is a future milestone (`docs/DECISIONS.md`) — keep designs portable and put schema decisions in `docs/`.
