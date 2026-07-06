---
title: "Підключення до Claude Desktop"
description: Додайте CloakBrowser MCP у Claude Desktop через stdio mcpServers configuration.
icon: material/chat
tags:
  - User Guide
---

# Підключення до Claude Desktop

Використовуйте stdio, коли Claude Desktop має запускати сервер на вимогу.

## Додавання сервера

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

## Необовʼязковий постійний профіль

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

## Перевірка

Ask Claude Desktop to open a page with the cloakbrowser server and take a browser snapshot.

## Повʼязані матеріали

- [Getting Started](../getting-started.md)
- [Постійний профіль входу](persistent-login-profile.md)
- [Tools](../tools.md)
