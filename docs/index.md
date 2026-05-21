# cloakbrowser-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes [CloakBrowser](https://github.com/CloakHQ/cloakbrowser) — a stealth Chromium automation library — as tools for AI agents.

!!! info "License"
    This project is licensed under the [MIT License](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/LICENSE).

## What it is

- Node.js ≥ 20 ESM, TypeScript `strict`.
- MCP stdio transport (`@modelcontextprotocol/sdk`).
- Public surface: programmatic API in `src/index.ts` and the CLI `cloakbrowser-mcp` (`src/cli.ts`).
- Backed by an abstract `BrowserAdapter`; ships with a real CloakBrowser adapter and an in-memory mock for tests.

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
