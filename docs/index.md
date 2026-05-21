---
description: Model Context Protocol server for CloakBrowser stealth Chromium automation.
icon: material/home
tags:
  - User Guide
---

<p class="clb-hero-logo" align="center">
  <img src="assets/brand/logo-wordmark.svg" alt="CloakBrowser MCP" width="620" />
</p>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Get started</a>
  <a class="md-button" href="tools/">Tool reference</a>
  <a class="md-button" href="docker/">Run with Docker</a>
</p>

# cloakbrowser-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes [CloakBrowser](https://github.com/CloakHQ/cloakbrowser) — a stealth Chromium automation library — as tools for AI agents.

!!! info "License"
    This project is licensed under the [MIT License](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/LICENSE).

## What it is

<div class="grid cards" markdown>

-   :fontawesome-brands-node-js: **Node.js runtime**

    Node.js ≥ 20, ESM, and TypeScript `strict`.

-   :material-connection: **MCP stdio server**

    Uses `@modelcontextprotocol/sdk` and exposes browser automation as MCP tools.

-   :material-package-variant: **npm and Docker**

    Run it from the published npm package or the GHCR Docker image.

-   :material-test-tube: **Testable adapter layer**

    Real CloakBrowser adapter plus an in-memory adapter for integration and contract tests.

</div>

## What it intentionally does not do

- Playwright MCP parity includes unsafe code execution tools (`browser_evaluate`, `browser_run_code_unsafe`). Run the server only for MCP clients you trust with browser automation and server-side code execution.
- No CAPTCHA solving, access-control bypass, or anti-bot evasion. CloakBrowser is a stealth-Chromium runtime; this project surfaces standard browser automation only.

## Where to go next

If you want to use the server:

- [Getting started](getting-started.md) — run from npm or Docker and wire an MCP client.
- [Docker](docker.md) — published image usage, artifact volume, and runtime defaults.
- [Configuration](configuration.md) — every CLI flag, env var, and capability flag.
- [Tools](tools.md) — per-tool reference.
- [Security](security.md) — trust model, unsafe tools, and responsible use.

If you want to work on the project:

- [Contributor Guide](contributor-guide.md) — development, testing, architecture, contributing, and roadmap links in one place.
