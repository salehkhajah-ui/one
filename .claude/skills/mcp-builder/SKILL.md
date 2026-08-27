---
name: mcp-builder
description: Build a complete, working MCP server from API documentation or an OpenAPI spec, with no manual setup. Use when the user says "build an MCP server", "make an MCP for [service]", "wrap this API as MCP", "ابني MCP server", or "اعمل MCP لـ [الخدمة]".
---

# MCP Builder

Take the API documentation or OpenAPI spec the user provides and produce a complete MCP server. Deliver:

- A full MCP server scaffold in **TypeScript**.
- **Auth handling** for whatever the API needs: API key, OAuth, or bearer token — configured via environment variables, never hard-coded.
- **Tool definitions** mapped from the API endpoints, with typed inputs and clear descriptions.
- **Error handling and rate-limit logic** (respect `Retry-After`, back off on 429s).
- A `package.json` with install and run instructions.

Verify the server compiles before declaring it done.

> The official Anthropic version of this skill lives at github.com/anthropics/skills → `mcp-builder`; consult it for current MCP SDK conventions.
