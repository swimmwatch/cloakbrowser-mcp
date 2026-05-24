---
description: Bridge architecture for CloakBrowser MCP.
icon: material/graph
tags:
  - Project Internals
---

# Architecture

## Runtime

`cloakbrowser-mcp` is an outer MCP server that can expose stdio or Streamable HTTP. At startup it:

1. resolves or installs the CloakBrowser Chromium binary;
2. writes a temporary Playwright MCP config file;
3. starts upstream `@playwright/mcp` as a child process over stdio;
4. connects to that child with the MCP SDK client transport;
5. exposes an outer MCP server to the user's MCP client over the selected transport;
6. forwards upstream tool list and tool calls unchanged;
7. appends `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.

## Why This Design

The upstream Playwright MCP project already owns the browser tool contracts and evolves quickly. The bridge model keeps this project small and avoids copying browser automation logic.

## Docker

The Docker image uses the pinned official Playwright MCP image as the base image. The bridge is installed under `/opt/cloakbrowser-mcp`, while upstream Playwright MCP remains available at `/app/cli.js`.

## Configuration

The bridge writes a temporary JSON config with CloakBrowser launch options. Upstream `PLAYWRIGHT_MCP_*` environment variables are still forwarded to upstream Playwright MCP.

## Transport

The default transport is stdio. Streamable HTTP is enabled explicitly with `--transport streamable-http` or `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http`.

For stdio, one outer server owns one upstream Playwright MCP child process and keeps upstream Playwright MCP's default profile behavior. For Streamable HTTP, each MCP session owns its own outer server, upstream child process, generated config, and in-memory transport state. HTTP sessions start upstream Playwright MCP with isolated browser profiles so concurrent users do not share or contend for the same persistent Chromium profile.

The session backend stores metadata only. The built-in backend is `memory`; future Redis, Postgres, or SQLite adapters can coordinate metadata and locks, but they cannot restore a live upstream browser process after its owning server process exits. Horizontal scaling should use sticky sessions keyed by `mcp-session-id`.

The bridge uses MCP SDK `StreamableHTTPServerTransport` for Streamable HTTP. It does not expose the deprecated MCP `SSEServerTransport` or a legacy `/sse` endpoint.
