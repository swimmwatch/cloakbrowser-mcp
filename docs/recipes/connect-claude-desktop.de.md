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

Fügen Sie diesen Eintrag zu `claude_desktop_config.json` hinzu und starten Sie Claude Desktop neu:

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

Bitten Sie Claude Desktop, über den Server `cloakbrowser` eine Seite zu öffnen und einen Browser-Snapshot zu erstellen. Die Upstream-Playwright-MCP-Browsertools sollten unverändert verfügbar sein.

## Verwandt

- [Erste Schritte](../getting-started.md#mcp-client-config)
- [Persistentes Login-Profil](persistent-login-profile.md)
- [Werkzeuge](../tools.md)
