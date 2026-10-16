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

Додайте цей запис до `claude_desktop_config.json`, а потім перезапустіть Claude Desktop:

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

Попросіть Claude Desktop використати сервер `cloakbrowser`, щоб відкрити сторінку й отримати знімок браузера. Вихідні браузерні інструменти Playwright MCP мають бути доступні без змін.

## Повʼязані матеріали

- [Початок роботи](../getting-started.md#mcp-client-config)
- [Постійний профіль входу](persistent-login-profile.md)
- [Інструменти](../tools.md)
