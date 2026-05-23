---
description: Bridge architecture for CloakBrowser MCP.
icon: material/graph
tags:
  - Project Internals
---

# Architecture

## Runtime

`cloakbrowser-mcp` is an outer stdio MCP server. At startup it:

1. resolves or installs the CloakBrowser Chromium binary;
2. writes a temporary Playwright MCP config file;
3. starts upstream `@playwright/mcp` as a child process over stdio;
4. connects to that child with the MCP SDK client transport;
5. exposes an outer MCP server to the user's MCP client;
6. forwards upstream tool list and tool calls unchanged;
7. appends `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.

## Why This Design

The upstream Playwright MCP project already owns the browser tool contracts and evolves quickly. The bridge model keeps this project small and avoids copying browser automation logic.

## Docker

The Docker image uses the pinned official Playwright MCP image as the base image. The bridge is installed under `/opt/cloakbrowser-mcp`, while upstream Playwright MCP remains available at `/app/cli.js`.

## Configuration

The bridge writes a temporary JSON config with CloakBrowser launch options. Upstream `PLAYWRIGHT_MCP_*` environment variables are still forwarded to upstream Playwright MCP.

## Transport

Only stdio is supported by the outer server. Upstream HTTP/SSE transport is not preserved by the bridge.
