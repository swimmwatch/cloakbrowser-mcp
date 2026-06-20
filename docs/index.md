---
description: CloakBrowser MCP is a Playwright MCP bridge for Model Context Protocol browser automation with CloakBrowser, npm, and Docker.
icon: material/home
tags:
  - User Guide
---

<p class="clb-hero-logo" align="center">
  <img src="assets/brand/logo-wordmark.svg" alt="CloakBrowser MCP" width="620" />
</p>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Get started</a>
  <a class="md-button" href="tools/">Tools</a>
  <a class="md-button" href="docker/">Docker</a>
</p>

# CloakBrowser MCP Server

`cloakbrowser-mcp` is a Model Context Protocol browser automation server that runs upstream `@playwright/mcp` with the CloakBrowser Chromium binary. Use it when you want Playwright MCP-compatible browser tools, CloakBrowser execution, npm installation, or a Docker image for stdio and Streamable HTTP MCP clients.

Current version: <!-- project-version -->v1.3.1<!-- /project-version -->.

## Version Compatibility

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.3.1`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | Compared in CI |
| `1.3.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`    | stdio, Streamable HTTP | Compared in CI |
| `1.2.7`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Compared in CI |
| `1.2.6`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Compared in CI |
| `1.2.5`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Compared in CI |
| `1.2.3`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Compared in CI |
| `1.2.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Compared in CI |
| `1.2.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Compared in CI |
| `1.2.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Compared in CI |
| `1.1.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Compared in CI |
| `1.0.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Compared in CI |
| `1.0.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Compared in CI |
| `1.0.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Compared in CI |

<!-- compatibility-table:end -->

See [Version Compatibility](version-compatibility.md) for the maintained mapping between this project's SemVer releases and upstream Playwright MCP versions.

## What It Is

<div class="grid cards" markdown>

- :material-connection: **Bridge runtime**

  Starts upstream Playwright MCP as a child process and forwards browser tool calls unchanged.

- :material-incognito: **CloakBrowser execution**

  Generates a Playwright MCP config with `launchOptions.executablePath` set to CloakBrowser.

- :fontawesome-brands-node-js: **npm CLI**

  Published as a thin Node.js CLI package for stdio and Streamable HTTP MCP clients.

- :fontawesome-brands-docker: **Docker image**

  Based on the official Playwright MCP image and preloads the CloakBrowser binary cache.

</div>

## Tool Surface

The upstream Playwright MCP tool contracts are authoritative. This project adds only two local introspection tools:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Next Steps

- [Getting Started](getting-started.md) for npm, Docker, and MCP client configuration.
- [Configuration](configuration.md) for supported environment variables.
- [Tools](tools.md) for tool-surface expectations and upstream parity.
- [FAQ](faq.md) for common installation, Docker, parity, and security questions.
- [Contributor Guide](contributor-guide.md) for development, testing, architecture, and release details.
