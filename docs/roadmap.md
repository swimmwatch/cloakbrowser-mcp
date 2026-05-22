---
description: Roadmap for CloakBrowser MCP.
icon: material/map
tags:
  - Project Internals
---

# Roadmap

## Completed For The Bridge Migration

- Upstream Playwright MCP bridge runtime.
- CloakBrowser executable injection through generated Playwright MCP config.
- npm CLI package as the public Node.js surface.
- Docker image based on the official Playwright MCP image.
- Local introspection tools only.
- Bridge-focused unit and integration tests.
- Docker smoke and upstream parity scripts.
- User-first documentation layout.

## Before First Stable Release

- Run Docker parity on CI for the target release image.
- Verify npm package install on a clean machine.
- Publish docs from the release workflow.
- Confirm MCP registry metadata after the first published package and image.

## Later

- Track upstream `@playwright/mcp` releases and update the pinned Docker base and npm dependency together.
- Add optional parity fixtures for upstream opt-in capabilities such as `network`, `pdf`, `vision`, and `devtools`.
- Add HTTP transport only if there is a concrete user need for an outer HTTP proxy.
