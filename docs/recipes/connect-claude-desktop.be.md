---
title: Падключыцца да Claude Desktop
description: Дадаць CloakBrowser MCP у Claude Desktop з канфігурацыяй stdio mcpServers.
icon: material/chat
tags:
  - User Guide
---

# Падключыцца да Claude Desktop

Выкарыстоўвайце stdio, калі Claude Desktop павінен запусціць сервер па патрабаванні.

## Дадаць сервер

Дадаць гэты запіс у `claude_desktop_config.json`, а затым перазапусціць Claude Desktop:

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

## Дадатковы пастаянны профіль

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

## Праверыць

Папытаеце Claude Desktop выкарыстаць сервер `cloakbrowser`, каб адкрыць старонку і зрабіць здымак браўзэра. Інструменты аглядальніка Playwright MCP уверх па плыні павінны быць даступныя без зменаў.

## ЗВЯЗАНАЕ

- [Getting Started](../getting-started.md)
- [Persistent Login Profile](persistent-login-profile.md)
- [Tools](../tools.md)
