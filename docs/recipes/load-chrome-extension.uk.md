---
title: Завантажити розширення Chrome
description: Завантажте розпаковане розширення Chrome в CloakBrowser MCP з постійним профілем.
icon: material/puzzle
tags:
  - User Guide
---

# Завантажити розширення Chrome

Розширення Chrome потребують розпакованого каталогу розширень та постійного профілю. Налаштуйте обидва параметри перед запуском веб-переглядача.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Використовуйте масив JSON, коли шляхи містять коми, під час завантаження декількох розширень або під час використання шляхів дискових літер Windows.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Перезапустіть сервер після зміни файлів розширень або шляхів розширень.

## Перевірити

Попросіть клієнта MCP відкрити сторінку, на якій має бути активне розширення, а потім перевірте поведінку сторінки або зробіть знімок екрана. Ви також можете зателефонувати `cloakbrowser_bridge_info`, щоб підтвердити, що міст працює з очікуваною версією пакета.

## Пов'язані

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Persistent Login Profile](persistent-login-profile.md)
