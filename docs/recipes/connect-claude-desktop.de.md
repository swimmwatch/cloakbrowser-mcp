---
title: "Mit Claude Desktop verbinden"
description: Fügen Sie CloakBrowser MCP mit einer stdio-mcpServers configuration zu Claude Desktop hinzu.
icon: material/chat
tags:
  - User Guide
---

# Mit Claude Desktop verbinden

Nutzen Sie stdio, wenn Claude Desktop den Server bei Bedarf starten soll.

## Server hinzufügen

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

## Optionales persistentes Profil

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

## Prüfen

Ask Claude Desktop to open a page with the cloakbrowser server and take a browser snapshot.

## Verwandt

- [Getting Started](../getting-started.md)
- [Persistentes Login-Profil](persistent-login-profile.md)
- [Tools](../tools.md)
