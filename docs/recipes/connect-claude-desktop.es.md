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

Ask Claude Desktop to open a page with the cloakbrowser server and take a browser snapshot.

## Relacionado

- [Getting Started](../getting-started.md)
- [Perfil de inicio de sesión persistente](persistent-login-profile.md)
- [Tools](../tools.md)
