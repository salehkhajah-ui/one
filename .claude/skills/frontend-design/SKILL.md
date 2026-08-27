---
name: frontend-design
description: Raise the UI from "generic AI output" to production-grade design by enforcing real design tokens, a spacing system, typography hierarchy, and component patterns. Use when the user says "make it look good", "improve the UI", "design this page", "polish the frontend", "خلي شكله حلو", "حسّن الـ UI", or "لمّع الـ frontend".
---

# Frontend Design

Default AI output looks like every other AI-built app. When designing or polishing UI, enforce:

- **8-point spacing grid** — margins, padding, and gaps in multiples of 8 (4 for fine detail).
- **A fixed type scale** — no arbitrary font sizes; pick from the established scale.
- **A real color system with semantic tokens** — `--color-surface`, `--color-danger`, etc., not raw hex sprinkled in components.
- **Hover, focus, and disabled states** for every interactive element (focus must be visible for keyboard users).
- **Loading and empty states** for every data-driven view.

Project notes (ONE app):
- Follow existing patterns in `app/components/`; all copy goes through `t(key)` from `lib/i18n-strings.ts` (en/ar pair, Kuwaiti-dialect Arabic).
- Use logical CSS (`ms-`/`me-`/`text-start`/`inset-inline-*`) so RTL flips for free; money stays LTR (`.money`).
- Decorative animation belongs in the `prefers-reduced-motion: no-preference` block of `globals.css`, with `[dir="rtl"]` origin overrides for bar-growth transforms.

> The official Anthropic version is at github.com/anthropics/skills → frontend-design
