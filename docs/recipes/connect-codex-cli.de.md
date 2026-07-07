---
title: "Mit Codex CLI verbinden"
description: Registrieren Sie CloakBrowser MCP in Codex CLI über stdio oder Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Mit Codex CLI verbinden

Nutzen Sie stdio, wenn Codex CloakBrowser MCP auf dieser Maschine starten soll.

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Prüfen

Ask Codex to list the cloakbrowser MCP tools or run a browser navigation tool.

## Verwandt

- [Getting Started](../getting-started.md)
- [Docker Streamable HTTP hinter Reverse Proxy](docker-streamable-http-reverse-proxy.md)
- [Tools](../tools.md)
