---
description: Compatibility mapping between cloakbrowser-mcp releases and upstream Playwright MCP versions.
icon: material/source-branch-sync
tags:
  - User Guide
---

# Version Compatibility

`cloakbrowser-mcp` follows Semantic Versioning for its own releases. Upstream
browser tool contracts come from `@playwright/mcp`, so each release records the
Playwright MCP version it is built and tested against.

| cloakbrowser-mcp | @playwright/mcp dependency | Playwright MCP Docker base | CloakBrowser dependency | Notes |
| --- | --- | --- | --- | --- |
| `1.0.0` | `^0.0.75` | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30` | Initial bridge release. Upstream Playwright MCP tool schemas, descriptions, and responses are forwarded unchanged. |

## How To Read This Table

- `cloakbrowser-mcp` is this project's npm and Docker release version.
- `@playwright/mcp dependency` is the npm dependency range used by the CLI
  package.
- `Playwright MCP Docker base` is the upstream image used by this project's
  Docker image.
- `CloakBrowser dependency` is the npm dependency range used to resolve and
  install the CloakBrowser Chromium binary.

When reproducibility matters, pin `cloakbrowser-mcp` by exact version instead
of using `latest`.
