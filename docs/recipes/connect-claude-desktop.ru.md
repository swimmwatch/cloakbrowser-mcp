---
title: Подключиться к Claude Desktop
description: Добавьте CloakBrowser MCP в Claude Desktop с конфигурацией mcpServers stdio.
icon: material/chat
tags:
  - User Guide
---

# Подключитесь к Claude Desktop

Используйте stdio, когда Claude Desktop должен запускать сервер по требованию.

## Добавить сервер

Добавьте эту запись в `claude_desktop_config.json`, затем перезапустите Claude Desktop:

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

## Необязательный постоянный профиль

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

## Проверять

Попросите Claude Desktop использовать сервер `cloakbrowser`, чтобы открыть страницу и сделать снимок браузера. Инструменты браузера upstream Playwright MCP должны быть доступны без изменений.

## Связанный

- [Начало работы](../getting-started.md)
- [Профиль постоянного входа](persistent-login-profile.md)
- [Инструменты](../tools.md)