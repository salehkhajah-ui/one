---
name: api-designer
description: Design a REST or GraphQL API from a requirements doc — endpoints, schemas, auth, and versioning. Use when the user says "design an API for", "plan the endpoints", "schema for", "صمّم API لـ", or "خطّط الـ endpoints".
---

# API Designer

From the requirements, deliver:

- An **OpenAPI 3.0 spec** (or GraphQL SDL when asked).
- **Resource naming that follows REST conventions**: plural nouns, nesting only when ownership is real, verbs only for true actions.
- **Pagination, filtering, and sorting patterns** — pick one style (cursor or offset) and apply it consistently.
- **Error response shapes**: a single machine-readable error envelope (`code`, `message`, `details`) used everywhere.
- Auth model and **versioning strategy** stated up front.

Rules:
- Design the contract before any implementation; get sign-off on the spec first.
- Every list endpoint gets pagination from day one.
- In this repo, amounts on the wire are integer minor units (fils) with an explicit currency field — never decimals.
