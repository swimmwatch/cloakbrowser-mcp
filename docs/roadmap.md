---
description: Roadmap for CloakBrowser MCP bridge runtime, Playwright MCP parity, Docker, npm packaging, and documentation work.
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
- Release workflows for npm, Docker, and documentation publishing.
- Docker release preflight with smoke and upstream parity checks.

## Before First Stable Release

- Configure the `NPM_TOKEN` repository secret.
- Configure GitHub Pages to use `GitHub Actions` as the publishing source.
- Confirm the GHCR package is public after the first Docker publish.
- Confirm MCP registry metadata after the first published package and image.

## Later

- Track upstream `@playwright/mcp` releases and update the pinned Docker base and npm dependency together.
- Add optional parity fixtures for upstream opt-in capabilities such as `network`, `pdf`, `vision`, and `devtools`.
- Add HTTP transport only if there is a concrete user need for an outer HTTP proxy.
