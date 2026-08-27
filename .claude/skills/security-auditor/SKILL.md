---
name: security-auditor
description: Run an OWASP Top 10 sweep over the codebase and surface vulnerabilities before they ship. Use when the user says "security audit", "check for vulnerabilities", "is this safe?", "افحص الـ vulnerabilities", or "هاد آمن؟".
---

# Security Auditor

Sweep the codebase against the OWASP Top 10. Catches:

- **SQL injection, XSS, CSRF** — any user input reaching a query, the DOM, or a state-changing endpoint without sanitization/tokens.
- **Exposed secrets** in code or committed env files — keys, tokens, connection strings.
- **Insecure auth flows** — missing session expiry, weak token validation, privilege checks done client-side only.
- **Open CORS** and **missing rate limits** on public endpoints.

For every finding: file and line, severity, a concrete exploit scenario, and the fix. No hand-waving — if it can't be exploited, say why it's still worth (or not worth) fixing.

Project note: this repo's rule is providers configured via environment variables behind interfaces — flag any credential that appears in source.
