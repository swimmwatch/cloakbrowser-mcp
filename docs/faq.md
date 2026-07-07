---
description: Frequently asked questions about CloakBrowser MCP installation, Docker usage, Playwright MCP parity, and security.
icon: material/help-circle
tags:
  - User Guide
---

# FAQ

## What is CloakBrowser MCP?

CloakBrowser MCP is a [Model Context Protocol](https://modelcontextprotocol.io/) server for browser automation over stdio or Streamable HTTP. It runs upstream [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) and points the Playwright MCP browser launch configuration at the [CloakBrowser](https://github.com/CloakHQ/CloakBrowser) Chromium binary.

## How is it different from upstream Playwright MCP?

The upstream Playwright MCP server owns the browser tool schemas, descriptions, and responses. CloakBrowser MCP keeps those tools unchanged and adds only two local introspection tools: `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.

See [`@playwright/mcp` vs `cloakbrowser-mcp`](comparison.md) for a neutral comparison of tool parity, CloakBrowser execution, packaging, Streamable HTTP, profiles, extensions, regional QA, and humanized input.

## Should I install it from npm or Docker?

Use npm when your MCP client already runs on your machine and Node.js 22.12 or newer is available. Use Docker when you want a repeatable Playwright MCP-based image with the CloakBrowser cache prepared inside the container.

## Which MCP clients can use it?

Any MCP client that supports stdio or Streamable HTTP servers can use CloakBrowser MCP. The [Getting Started](getting-started.md) guide includes stdio JSON examples for Codex, Claude Desktop, Claude Code, Cursor, VS Code/Cline-style clients, Continue, Windsurf, Goose, and Warp-style configurations.

Short setup recipes are available for [Claude Desktop](recipes/connect-claude-desktop.md) and [Codex CLI](recipes/connect-codex-cli.md).

## Where are the practical setup examples?

Use the [Recipes](recipes/index.md) section for task-focused pages covering persistent login profiles, Chrome extensions, Docker Streamable HTTP behind a reverse proxy, regional QA through a proxy, MCP client setup, and CI smoke tests.

## Does it support the same browser tools as Playwright MCP?

Yes. Upstream Playwright MCP browser tools are forwarded unchanged. The project also runs a parity comparison in CI so changes to the bridge can be checked against the official Playwright MCP behavior.

## Does Docker improve security?

Docker gives you a more repeatable and isolated runtime, but it does not make browser automation risk-free. Treat automated browsing as untrusted execution: avoid sharing secrets with unknown pages, keep artifacts and screenshots in controlled directories, and review the [Security](security.md) guide before exposing the server to other systems.

## Does this project use analytics or tracking?

No. The documentation site does not enable analytics by default. Search-engine discovery is handled through standard metadata, `robots.txt`, sitemap generation, optional webmaster verification tags, and optional IndexNow notifications.
