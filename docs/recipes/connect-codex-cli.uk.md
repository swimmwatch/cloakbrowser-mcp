---
title: "Підключення до Codex CLI"
description: Зареєструйте CloakBrowser MCP у Codex CLI через stdio або Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Підключення до Codex CLI

Використовуйте stdio, коли Codex має запускати CloakBrowser MCP на цій машині.

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Перевірка

Ask Codex to list the cloakbrowser MCP tools or run a browser navigation tool.

## Повʼязані матеріали

- [Getting Started](../getting-started.md)
- [Docker Streamable HTTP за зворотним проксі](docker-streamable-http-reverse-proxy.md)
- [Tools](../tools.md)
