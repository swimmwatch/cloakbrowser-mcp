---
title: "Conectar ao Claude Desktop"
description: Adicione o CloakBrowser MCP ao Claude Desktop com configuração stdio de mcpServers.
icon: material/chat
tags:
  - User Guide
---

# Conectar ao Claude Desktop

Use stdio quando o Claude Desktop deve iniciar o servidor sob demanda.

## Adicionar o servidor

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
- [Perfil de login persistente](persistent-login-profile.md)
- [Tools](../tools.md)
