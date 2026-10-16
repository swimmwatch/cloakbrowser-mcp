---
title: "Підключення до Codex CLI"
description: Зареєструйте CloakBrowser MCP у Codex CLI через stdio або Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Підключення до Codex CLI

Використовуйте stdio, коли Codex має запускати CloakBrowser MCP на цій машині.

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

Запустіть сервер:

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

Зареєструйте вже запущену кінцеву точку:

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Перевірка

Попросіть Codex показати інструменти MCP сервера `cloakbrowser` або виконати браузерну навігацію. Вихідні браузерні інструменти Playwright MCP мають відображатися разом із `cloakbrowser_binary_info` та `cloakbrowser_bridge_info`.

## Повʼязані матеріали

- [Початок роботи](../getting-started.md#mcp-client-config)
- [Docker Streamable HTTP за зворотним проксі](docker-streamable-http-reverse-proxy.md)
- [Інструменти](../tools.md)
