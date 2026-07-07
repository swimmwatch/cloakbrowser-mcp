---
title: "@playwright/mcp vs cloakbrowser-mcp"
description: Compare upstream Playwright MCP with CloakBrowser MCP for browser tool parity, CloakBrowser execution, packaging, Streamable HTTP, persistent profiles, extension loading, regional QA, and humanized input.
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp vs cloakbrowser-mcp

Upstream `@playwright/mcp` is the canonical Playwright MCP browser tool server.
`cloakbrowser-mcp` is for teams that want that same tool surface, but need
CloakBrowser Chromium and packaged deployment workflows around it.

## Feature Comparison

| Area | `@playwright/mcp` | `cloakbrowser-mcp` |
| --- | --- | --- |
| Upstream tools unchanged | Owns the canonical browser tool schemas, descriptions, and responses. | Forwards upstream browser tools unchanged and checks parity in CI. |
| CloakBrowser binary | Uses the browser runtime selected by upstream Playwright MCP. | Generates upstream config with CloakBrowser Chromium as the executable. |
| npm distribution | Published as the upstream Playwright MCP package. | Published as `cloakbrowser-mcp` for `npx` and MCP client stdio configs. |
| Docker image | Provides the official Playwright MCP image. | Builds from the official Playwright MCP image and prepares CloakBrowser runtime defaults. |
| Streamable HTTP | Follows upstream transport behavior. | Packages stdio and Streamable HTTP with health, readiness, auth, HTTPS, and session metadata options. |
| Persistent profiles | Use upstream-supported browser state options. | Adds validated `PLAYWRIGHT_MCP_USER_DATA_DIR` handling and profile locking around generated config. |
| Extension paths | Configure through the browser runtime when supported. | Adds validated Chrome extension directory loading with persistent profile requirements. |
| Context validation | Depends on upstream configuration shape. | Validates supported context options before writing generated Playwright MCP config. |
| GeoIP regional QA | Proxy routing remains upstream-owned. | Can align CloakBrowser timezone, language, and locale fingerprint flags with the configured proxy location. |
| Humanized interactions | Uses standard Playwright MCP interaction behavior. | Can route supported page interactions through CloakBrowser human-like input behavior. |

## Choose Upstream When

- You want the smallest possible Playwright MCP setup.
- You do not need CloakBrowser Chromium.
- You prefer to follow upstream Playwright MCP packaging directly.

## Choose CloakBrowser MCP When

- You need the upstream Playwright MCP tools to run with CloakBrowser Chromium.
- You want npm, Docker, and Streamable HTTP deployment paths documented in one package.
- You need persistent login profiles, extension loading, context validation, regional QA helpers, or humanized input behavior.

## Next Steps

- [Getting Started](getting-started.md) shows npm, Docker, and MCP client setup.
- [Recipes](recipes/index.md) gives task-focused setup paths.
- [Tools](tools.md) explains the forwarded upstream tool surface and local introspection tools.
