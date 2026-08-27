---
name: documentation
description: Write READMEs, API docs, and JSDoc/TSDoc that don't read like they were written by a robot. Use when the user says "document this", "write a README", "add docstrings", "وثّق هاد", or "اكتب README".
---

# Documentation

What gets written:

- **Install + quickstart** — the shortest path from clone to running.
- **Usage examples that actually work** — run every snippet before including it.
- **API reference** — parameters, return values, and the errors a caller can hit.
- **Troubleshooting section** — the real failure modes and their fixes.

Rules:
- Write for a human in a hurry: lead with what the thing does, not its history.
- No filler ("This section describes…"), no marketing adjectives.
- Keep docs next to the code they describe; JSDoc/TSDoc on exported symbols only where the signature alone isn't enough.
- In this repo, architecture and formula changes also update `docs/` (`FINANCIAL_ENGINE.md` for formulas, `DECISIONS.md` for architecture decisions).
