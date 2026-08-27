---
name: deployment
description: Set up the deploy pipeline — pick the right platform, write the config, and ship. Use when the user says "deploy this", "ship it", "set up Vercel", "dockerize it", "انشر هاد", or "جهّز Vercel".
---

# Deployment

Knows: Vercel, Railway, Fly.io, AWS, Docker, Kubernetes basics, GitHub Actions.

Steps:

1. Pick the platform that fits the app (this project deploys to **Vercel** — a Next.js app, so prefer zero-config Vercel unless told otherwise).
2. Write the config: platform config file, Dockerfile if needed, GitHub Actions workflow for CI (typecheck, lint, test, build) before deploy.
3. Wire **environment variables through the platform's secret store** — never commit secrets; this repo keeps providers behind `AIProvider` / `BankConnectionProvider` interfaces configured by env vars.
4. Run the production build locally (`npm run build`) before shipping.
5. Deploy, verify the live URL, and report exactly what was deployed and where.
