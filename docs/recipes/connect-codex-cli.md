---
title: Connect To Codex CLI
description: Register CloakBrowser MCP with Codex CLI over stdio or Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Connect To Codex CLI

Use stdio when Codex should start CloakBrowser MCP for the current machine.

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

Start the server:

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

Register the already-running endpoint:

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Verify

Ask Codex to list MCP tools for `cloakbrowser` or use a browser navigation tool. The upstream Playwright MCP browser tools should appear alongside `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.

## Related

- [Getting Started](../getting-started.md#mcp-client-config)
- [Docker Streamable HTTP Behind Reverse Proxy](docker-streamable-http-reverse-proxy.md)
- [Tools](../tools.md)
