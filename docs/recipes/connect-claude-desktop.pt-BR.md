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

Adicione esta entrada a `claude_desktop_config.json` e reinicie o Claude Desktop:

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

Peça ao Claude Desktop para usar o servidor `cloakbrowser`, abrir uma página e obter um snapshot do navegador. As ferramentas originais do Playwright MCP devem estar disponíveis sem alterações.

## Relacionado

- [Introdução](../getting-started.md#mcp-client-config)
- [Perfil de login persistente](persistent-login-profile.md)
- [Ferramentas](../tools.md)
