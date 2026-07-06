---
title: "Connecter à Claude Desktop"
description: Ajoutez CloakBrowser MCP à Claude Desktop avec une configuration stdio mcpServers.
icon: material/chat
tags:
  - User Guide
---

# Connecter à Claude Desktop

Utilisez stdio lorsque Claude Desktop doit démarrer le serveur à la demande.

## Ajouter le serveur

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

## Profil persistant facultatif

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

## Vérifier

Ask Claude Desktop to open a page with the cloakbrowser server and take a browser snapshot.

## Liens associés

- [Getting Started](../getting-started.md)
- [Profil de connexion persistant](persistent-login-profile.md)
- [Tools](../tools.md)
