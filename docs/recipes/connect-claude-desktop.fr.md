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

Ajoutez cette entrée à `claude_desktop_config.json`, puis redémarrez Claude Desktop :

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

Demandez à Claude Desktop d’utiliser le serveur `cloakbrowser` pour ouvrir une page et obtenir un instantané du navigateur. Les outils navigateur Playwright MCP upstream doivent être disponibles sans modification.

## Liens associés

- [Pour commencer](../getting-started.md#mcp-client-config)
- [Profil de connexion persistant](persistent-login-profile.md)
- [Outils](../tools.md)
