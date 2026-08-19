# ONE — Security

ONE handles sensitive financial information. Security is fundamental, not a feature.

## Current state (Milestone 1 — Demo Mode)

- No backend, no auth, no secrets, no network calls. All demo data is generated client-side.
- No analytics or third-party scripts.
- Nothing to leak — but every pattern below is already reflected in the architecture (provider interfaces, no client-trusted IDs in engine APIs, no secrets in the repo).

## Requirements from Milestone 2 onward

**Data access**
- Supabase Row Level Security on **all** user financial tables; a user can never access another user's rows.
- Never trust client-supplied user IDs — derive identity from the auth token server-side.
- Service-role credentials exist only in server environments (Edge Functions/CI), never shipped to the client.

**Secrets**
- No secrets in the repository, ever. Env vars only; `.env*` is git-ignored. AI/bank providers read config at the edge, not in client bundles.

**Logging**
- Never log bank credentials, access tokens, full secrets, or unnecessarily sensitive financial payloads. Log technical errors with IDs, not payloads.

**Input validation**
- Zod validation on every Edge Function input and every external boundary (forms, CSV import, AI structured outputs).

**Client**
- Auth tokens in secure storage where the platform supports it; shortest practical session lifetimes; no financial data in URLs.

**Auditability**
- Sensitive actions create `audit_events` rows: allocation accepted, goal changed, account imported, financial profile changed, AI recommendation generated. Store event metadata, not raw sensitive natural-language content.

**Privacy architecture**
- Support data export, account deletion, connection revocation, AI-memory deletion, future consent management. Users can see what data ONE uses.

## Threat model sketch

| Threat | Control |
|---|---|
| Cross-user data access | RLS on every table + server-derived identity |
| Leaked service credentials | Server-only env, key rotation, least privilege |
| Client tampering with amounts | Engine re-computation server-side for anything persisted; client values treated as untrusted input |
| Prompt injection via transaction text → AI | AI receives engine outputs and whitelisted fields; tools are fixed functions with typed inputs; AI cannot query arbitrary data |
| Secrets in git history | CI secret scanning; no-secrets rule in CLAUDE.md |
| Fake "bank connectivity" trust | UI never claims live bank integration unless a real provider is configured |
