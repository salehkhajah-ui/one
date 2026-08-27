---
name: git-workflow
description: Keep git hygiene tight — clear commit messages, clean branch names, and PR descriptions that actually explain the change. Use when the user says "commit this", "make a PR", "write a commit message", "clean up branches", "اعمل commit", or "اكتب commit message".
---

# Git Workflow

Produce:

- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:` — subject in imperative mood, body explaining *why* when the diff alone doesn't.
- **PR descriptions** with three sections: Summary, Changes, Testing notes.
- **Branch names** tied to the issue: `feat/123-short-slug`, `fix/456-short-slug`.

Rules:
- One logical change per commit; don't mix refactors with features.
- Never commit secrets, `node_modules`, or generated artifacts.
- Never rewrite history on a shared branch (no rebase/amend/force-push on someone else's branch).
- Only open a PR when the user asks for one.
