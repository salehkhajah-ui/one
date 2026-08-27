---
name: playwright
description: Test the app in a real browser with Playwright — click buttons, fill forms, walk complete user flows, and capture a screenshot the moment something breaks. Use when the user says "test this flow", "run e2e tests", "make sure signup works", "جرّب هاد الـ flow", or "تأكد إن الـ signup شغال".
---

# Playwright (E2E Testing)

Most bugs hide in the gap between "the code works" and "the user flow works". Close that gap by driving the app in a real browser:

1. Start the app (`npm run dev` for this project) and launch **headless Chromium** via Playwright.
2. Walk the requested user flow step by step — navigate, click, fill forms, submit.
3. **Record what happened on screen at every step** (short step log).
4. **Take a screenshot at the moment of failure** and save it where the user can see it.
5. Return an organized **pass/fail report**: each step, its outcome, and any console/network errors observed.

Project notes:
- Test both `en` and `ar` (RTL) modes when the flow renders user-facing UI.
- Never treat a failing flow as an infra flake without reproducing it twice.

> The official Anthropic version of this skill is `webapp-testing`: github.com/anthropics/skills → webapp-testing
