---
name: error-handling
description: Audit error handling and replace silent try/catch blocks with real recovery logic and observability. Use when the user says "improve error handling", "add logging", "make it resilient", "حسّن الـ error handling", or "خليه resilient".
---

# Error Handling

Hunt down silent `try/catch` blocks and empty `.catch()`es, then replace them with:

- **Typed error classes** — errors a caller can branch on (`instanceof RateLimitError`), not string matching.
- **Retry logic with exponential backoff** for transient failures (network, 429/503) — bounded attempts, jitter, and no retry for permanent errors.
- **Structured logging** — errors as searchable objects (code, context, cause) so they're findable in Sentry or Datadog, not `console.log(e)`.
- **User-facing messages that help** — what happened and what to do next, never a bare "Something went wrong".

Rules:
- Catch only where you can recover or add context; otherwise let it propagate.
- Never swallow an error without logging it and deciding the fallback on purpose.
- In this repo, user-facing error copy goes through `lib/i18n-strings.ts` (en/ar, calm and non-judgmental tone).
