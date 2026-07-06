---
title: "Conectar ao Codex CLI"
description: Registre o CloakBrowser MCP no Codex CLI via stdio ou Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Conectar ao Codex CLI

Use stdio quando o Codex deve iniciar o CloakBrowser MCP nesta máquina.

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
- [Docker Streamable HTTP atrás de proxy reverso](docker-streamable-http-reverse-proxy.md)
- [Tools](../tools.md)
