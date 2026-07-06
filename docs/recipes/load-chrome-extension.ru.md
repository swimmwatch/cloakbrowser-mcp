---
title: Загрузить расширение Chrome
description: Загрузите распакованное расширение Chrome в CloakBrowser MCP с постоянным профилем.
icon: material/puzzle
tags:
  - User Guide
---

# Загрузка расширения Chrome

Для расширений Chrome требуется распакованный каталог расширений и постоянный профиль. Настройте оба параметра перед запуском браузера.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Используйте массив JSON, если пути содержат запятые, при загрузке нескольких расширений или при использовании путей к буквам дисков Windows.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Перезагрузите сервер после изменения файлов расширений или путей расширений.

## Проверять

Попросите клиент MCP открыть страницу, на которой расширение должно быть активным, затем проверьте поведение страницы или сделайте снимок экрана. Вы также можете позвонить по телефону `cloakbrowser_bridge_info`, чтобы подтвердить, что мост работает с ожидаемой версией пакета.

## Связанный

- [Конфигурация](../configuration.md)
- [Docker](../docker.md)
- [Профиль постоянного входа](persistent-login-profile.md)