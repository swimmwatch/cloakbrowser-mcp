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

| cloakbrowser-mcp | @playwright/mcp dependency | Playwright MCP Docker base | CloakBrowser dependency | Node.js | Transport | Tested platform | Tool parity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `1.0.2` | `^0.0.75` | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30` | `>=20` | stdio | npm on Node.js 20/22, Docker `linux/amd64` | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.0.1` | `^0.0.75` | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30` | `>=20` | stdio | npm on Node.js 20/22, Docker `linux/amd64` | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.0.0` | `^0.0.75` | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30` | `>=20` | stdio | npm on Node.js 20/22, Docker `linux/amd64` | Upstream default browser tools compared against the official Playwright MCP image in CI. |

## How To Read This Table

- `cloakbrowser-mcp` is this project's npm and Docker release version.
- `@playwright/mcp dependency` is the npm dependency range used by the CLI
  package.
- `Playwright MCP Docker base` is the upstream image used by this project's
  Docker image.
- `CloakBrowser dependency` is the npm dependency range used to resolve and
  install the CloakBrowser Chromium binary.
- `Node.js` is the supported runtime range for the npm package.
- `Transport` is the MCP transport exposed by this bridge.
- `Tested platform` is the platform covered by CI and release smoke tests.
- `Tool parity` records whether the upstream Playwright MCP default tool
  surface is compared against the official upstream runtime.

When reproducibility matters, pin `cloakbrowser-mcp` by exact version instead
of using `latest`.

Docker releases currently publish `linux/amd64` only. Other architectures are
deferred until CloakBrowser and upstream Playwright MCP behavior are verified
end to end for those targets.
