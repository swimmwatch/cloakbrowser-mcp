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
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Використовуйте шляхи контейнерів у змінних середовища. Шлях хоста використовується лише в монтуванні `-v`.

## Перевірити

1. Попросіть клієнт MCP відкрити сторінку входу й увійдіть у систему.
2. Коректно зупиніть сервер.
3. Запустіть його знову з тим самим `PLAYWRIGHT_MCP_USER_DATA_DIR`.
4. Попросіть клієнт знову відкрити сайт і переконайтеся, що стан входу зберігся.

## Пов'язані

- [Налаштування](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#persistent-profiles)
- [Завантажити розширення Chrome](load-chrome-extension.md)

## CloakBrowser 0.6.0

Коли stealth CloakBrowser увімкнено, явно налаштований постійний профіль зберігає fingerprint seed у `.cloakbrowser-seed`. Перший запуск після оновлення призначає seed, якщо файла немає. Явний `--fingerprint`, зокрема `--fingerprint=off`, має пріоритет і не змінює файл. Коли stealth вимкнено, файл не змінюється. Пошкоджений файл відновлюється з попередженням; помилка доступу до файла зупиняє запуск.
