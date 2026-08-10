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

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp dependency | Playwright MCP Docker base                 | CloakBrowser dependency | Node.js                | Transport              | Tested platform                                                                                                           | Tool parity                                                                              |
| ---------------- | -------------------------- | ------------------------------------------ | ----------------------- | ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `1.11.0`         | `^0.0.79`                  | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.6`                | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | npm on Node.js 22 and 24-26 across Linux x64/arm64, macOS arm64/x64, and Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.10.0`         | `^0.0.78`                  | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.3`                | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | npm on Node.js 22 and 24-26 across Linux x64/arm64, macOS arm64/x64, and Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.9.0`          | `^0.0.78`                  | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.1`                | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | npm on Node.js 22 and 24-26 across Linux x64/arm64, macOS arm64/x64, and Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.8.0`          | `^0.0.78`                  | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`               | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | npm on Node.js 22 and 24-26 across Linux x64/arm64, macOS arm64/x64, and Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.7.0`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`                | `>=22.12`              | stdio, Streamable HTTP | npm on Node.js 22-26 across Linux x64/arm64, macOS arm64/x64, and Windows x64; Docker `linux/amd64`, `linux/arm64`        | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.6.1`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`                | `>=22.12`              | stdio, Streamable HTTP | npm on Node.js 22-26 across Linux x64/arm64, macOS arm64/x64, and Windows x64; Docker `linux/amd64`, `linux/arm64`        | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.6.0`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`                | `>=22.12`              | stdio, Streamable HTTP | npm on Node.js 22-26 across Linux x64/arm64, macOS arm64/x64, and Windows x64; Docker `linux/amd64`, `linux/arm64`        | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.5.0`          | `^0.0.76`                  | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`                | `>=22.12`              | stdio, Streamable HTTP | npm on Node.js 22-26 across Linux x64/arm64, macOS arm64/x64, and Windows x64; Docker `linux/amd64`, `linux/arm64`        | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.4.0`          | `^0.0.76`                  | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`               | `>=22.12`              | stdio, Streamable HTTP | npm on Node.js 22-26 across Linux x64/arm64, macOS arm64/x64, and Windows x64; Docker `linux/amd64`, `linux/arm64`        | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.3.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`               | `>=20`                 | stdio, Streamable HTTP | npm on Node.js 20-26, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.2.7`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio, Streamable HTTP | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.2.6`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio, Streamable HTTP | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.2.5`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio, Streamable HTTP | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.2.3`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio, Streamable HTTP | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.2.2`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio, Streamable HTTP | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.2.1`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio, Streamable HTTP | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.2.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio, Streamable HTTP | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.1.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio, Streamable HTTP | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.0.2`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio                  | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.0.1`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio                  | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |
| `1.0.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`                 | stdio                  | npm on Node.js 20/22, Docker `linux/amd64`                                                                                | Upstream default browser tools compared against the official Playwright MCP image in CI. |

<!-- compatibility-table:end -->

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

Docker releases currently publish `linux/amd64` and `linux/arm64`. Browser
parity is compared on `linux/amd64`; both Docker platforms receive release
smoke tests before a multi-platform manifest is published.
