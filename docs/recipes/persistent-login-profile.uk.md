---
title: Постійний профіль входу
description: Повторно використовуйте файли cookie CloakBrowser, локальне сховище, кеш-пам 'ять і стан розширення, запустивши CloakBrowser MCP з постійним каталогом профілю.
icon: material/account-key
tags:
  - User Guide
---

# Постійний профіль входу

Використовуйте постійний профіль, коли клієнт MCP повинен зберігати файли cookie, локальне сховище, кеш-пам 'ять або стан розширення між сеансами веб-переглядача.

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

Наведіть клієнт MCP на ту ж команду stdio. Тримайте один активний сервер у каталозі профілю; міст відхиляє дублювання активного використання, щоб зменшити ризик корупції профілю Chromium.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Використовуйте шляхи контейнерів у змінних середовища. Шлях хоста використовується лише в монтуванні `-v`.

## Перевірити

1. Попросіть клієнта MCP відкрити сторінку входу та ввійти.
2. Чисто зупиніть сервер.
3. Почніть знову з тим самим `PLAYWRIGHT_MCP_USER_DATA_DIR`.
4. Попросіть клієнта повторно відвідати сайт і підтвердити, що стан входу все ще присутній.

## Пов'язані

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Load Chrome Extension](load-chrome-extension.md)
