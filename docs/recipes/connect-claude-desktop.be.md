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

Папрасіце Claude Desktop выкарыстаць сервер `cloakbrowser`, каб адкрыць старонку і атрымаць здымак браўзера. Зыходныя браўзерныя інструменты Playwright MCP павінны быць даступнымі без змен.

## ЗВЯЗАНАЕ

- [Пачатак працы](../getting-started.md#mcp-client-config)
- [Пастаянны профіль уваходу](persistent-login-profile.md)
- [Інструменты](../tools.md)
