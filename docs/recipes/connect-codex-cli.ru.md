---
title: Подключиться к Codex CLI
description: Зарегистрируйте CloakBrowser MCP с Codex CLI вместо stdio или Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Подключитесь к Codex CLI

Используйте stdio, когда Кодекс должен запустить CloakBrowser MCP для текущего компьютера.

## Стдио

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

Запустите сервер:

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

Зарегистрируйте уже работающую конечную точку:

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Проверять

Попросите Codex перечислить инструменты MCP для `cloakbrowser` или воспользуйтесь инструментом навигации в браузере. Инструменты браузера upstream Playwright MCP должны появиться рядом с `cloakbrowser_binary_info` и `cloakbrowser_bridge_info`.

## Связанный

- [Начало работы](../getting-started.md)
- [Docker Streamable HTTP за обратным прокси](docker-streamable-http-reverse-proxy.md)
- [Инструменты](../tools.md)
