---
title: Завантажити розширення Chrome
description: Завантажте розпаковане розширення Chrome в CloakBrowser MCP з постійним профілем.
icon: material/puzzle
tags:
  - User Guide
---

# Завантажити розширення Chrome

Розширення Chrome потребують розпакованого каталогу розширень та постійного профілю. Налаштуйте обидва параметри перед запуском веб-переглядача.

Цей рецепт використовує запуск розпакованого розширення CloakBrowser. Режим підключення через окремо встановлене офіційне Playwright Extension використовує `PLAYWRIGHT_MCP_EXTENSION=true`, process-level `PLAYWRIGHT_MCP_EXTENSION_TOKEN` та окремий persistent profile. Не поєднуйте ці механізми.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Використовуйте масив JSON, коли шляхи містять коми, під час завантаження декількох розширень або під час використання шляхів дискових літер Windows.

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Перезапустіть сервер після зміни файлів розширень або шляхів розширень.

## Перевірити

Попросіть клієнт MCP відкрити сторінку, на якій має працювати розширення, потім перевірте поведінку сторінки або зробіть знімок екрана. Також можна викликати `cloakbrowser_bridge_info`, щоб перевірити очікувану версію пакета мосту.

## Пов'язані

- [Налаштування](../configuration.md#chrome-extensions)
- [Docker](../docker.md#chrome-extensions)
- [Постійний профіль входу](persistent-login-profile.md)
