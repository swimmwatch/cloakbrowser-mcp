---
title: "Conectar con Codex CLI"
description: Registra CloakBrowser MCP en Codex CLI por stdio o Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Conectar con Codex CLI

Usa stdio cuando Codex debe iniciar CloakBrowser MCP en esta máquina.

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Verificar

Ask Codex to list the cloakbrowser MCP tools or run a browser navigation tool.

## Relacionado

- [Getting Started](../getting-started.md)
- [Docker Streamable HTTP detrás de proxy inverso](docker-streamable-http-reverse-proxy.md)
- [Tools](../tools.md)
