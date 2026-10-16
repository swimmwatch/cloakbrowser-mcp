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

Inicie el servidor:

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

Registre el endpoint que ya está en ejecución:

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Verificar

Pide a Codex que muestre las herramientas MCP del servidor `cloakbrowser` o use una herramienta de navegación. Las herramientas originales de Playwright MCP deben aparecer junto a `cloakbrowser_binary_info` y `cloakbrowser_bridge_info`.

## Relacionado

- [Primeros pasos](../getting-started.md#mcp-client-config)
- [Docker Streamable HTTP detrás de proxy inverso](docker-streamable-http-reverse-proxy.md)
- [Herramientas](../tools.md)
