---
description: Drop-in Playwright MCP-compatible browser automation server with unchanged upstream tools, CloakBrowser Chromium, and production-ready npm, Docker, and Streamable HTTP packaging.
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Get started</a>
  <a class="md-button" href="comparison/">Compare</a>
  <a class="md-button" href="recipes/">Recipes</a>
</p>

# CloakBrowser MCP Server

`cloakbrowser-mcp` is a drop-in Playwright MCP-compatible browser automation server with unchanged upstream tools, CloakBrowser Chromium, and production-ready npm, Docker, and Streamable HTTP packaging. It runs upstream `@playwright/mcp` as the canonical browser tool surface and adds deployment-oriented CloakBrowser execution features around it.

## 30-second demo

<div class="clb-demo-video">
  <video controls playsinline preload="metadata" poster="assets/videos/30-second-demo-poster.png">
    <source src="assets/videos/30-second-demo.mp4" type="video/mp4" />
    <a href="assets/videos/30-second-demo.mp4">Download the demo video.</a>
  </video>
</div>

<p class="clb-demo-caption">Watch the first run: start the npm package, connect an MCP client, ask for web research, automation, or testing, and inspect the real browser result.</p>

Use it when you want Playwright MCP-compatible browser tools plus persistent profiles, extension loading, context validation, GeoIP-aware proxy matching for regional QA, or humanized input behavior for interaction-sensitive flows.

Current version: {{ project.version_tag }}.

## Version Compatibility

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.6.1`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`     | stdio, Streamable HTTP | Compared in CI |
| `1.6.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Compared in CI |
| `1.5.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`     | stdio, Streamable HTTP | Compared in CI |
| `1.4.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | Compared in CI |
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

- :material-map-marker-radius: **GeoIP proxy matching**

  Aligns CloakBrowser timezone, language, and locale fingerprint flags with a configured proxy location.

- :material-gesture-tap: **Humanized input behavior**

  Routes page interactions through CloakBrowser's human-like mouse, keyboard, and scroll layer.

</div>

## Tool Surface

The upstream Playwright MCP tool contracts are authoritative. This project adds only two local introspection tools:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

See [`@playwright/mcp` vs `cloakbrowser-mcp`](comparison.md) for a neutral feature comparison.

## Next Steps

- [Getting Started](getting-started.md) for npm, Docker, and MCP client configuration.
- [`@playwright/mcp` vs `cloakbrowser-mcp`](comparison.md) for deciding when the bridge is useful.
- [Recipes](recipes/index.md) for persistent login profiles, extensions, reverse proxies, regional QA, MCP clients, and CI smoke tests.
- [Configuration](configuration.md) for supported environment variables.
- [GeoIP Proxy Matching](geoip-proxy-matching.md) for regional QA, runtime proxy metadata, and multi-location Streamable HTTP sessions.
- [Humanized Input Behavior](humanized-input-behavior.md) for interaction realism, setup, and use cases.
- [Tools](tools.md) for tool-surface expectations and upstream parity.
- [FAQ](faq.md) for common installation, Docker, parity, and security questions.
- [Contributor Guide](contributor-guide.md) for development, testing, architecture, and release details.
