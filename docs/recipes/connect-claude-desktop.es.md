---
title: "Conectar con Claude Desktop"
description: Añade CloakBrowser MCP a Claude Desktop con una configuración stdio de mcpServers.
icon: material/chat
tags:
  - User Guide
---

# Conectar con Claude Desktop

Usa stdio cuando Claude Desktop debe iniciar el servidor bajo demanda.

## Añadir el servidor

Añada esta entrada a `claude_desktop_config.json` y reinicie Claude Desktop:

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest"]
    }
  }
}
```

## Perfil persistente opcional

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest"],
      "env": {
        "PLAYWRIGHT_MCP_USER_DATA_DIR": "/absolute/path/to/profile"
      }
    }
  }
}
```

## Verificar

Pide a Claude Desktop que use el servidor `cloakbrowser` para abrir una página y obtener una captura del navegador. Las herramientas originales de Playwright MCP deben estar disponibles sin cambios.

## Relacionado

- [Primeros pasos](../getting-started.md#mcp-client-config)
- [Perfil de inicio de sesión persistente](persistent-login-profile.md)
- [Herramientas](../tools.md)
