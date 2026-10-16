---
title: Постоянный профиль входа
description: Повторно используйте файлы cookie CloakBrowser, локальное хранилище, кэш и состояние расширения, запустив CloakBrowser MCP с постоянным каталогом профиля.
icon: material/account-key
tags:
  - User Guide
---

# Постоянный профиль входа

Используйте постоянный профиль, когда клиент MCP должен сохранять файлы cookie, локальное хранилище, кеш или состояние расширения между сеансами браузера.

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

Направьте свой клиент MCP на ту же команду stdio. Сохраняйте по одному активному серверу в каждом каталоге профиля; мост отклоняет дублированное активное использование, чтобы снизить риск повреждения профиля Chromium.

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Используйте пути к контейнерам в переменных среды. Путь к хосту используется только при монтировании `-v`.

## Проверять

1. Попросите клиент MCP открыть страницу входа и войдите в систему.
2. Корректно остановите сервер.
3. Запустите его снова с тем же `PLAYWRIGHT_MCP_USER_DATA_DIR`.
4. Попросите клиент повторно открыть сайт и убедитесь, что состояние входа сохранилось.

## Связанный

- [Конфигурация](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#persistent-profiles)
- [Загрузить расширение Chrome](load-chrome-extension.md)

## CloakBrowser 0.6.0

При включённом stealth CloakBrowser явно настроенный постоянный профиль сохраняет fingerprint seed в `.cloakbrowser-seed`. Первый запуск после обновления назначает seed, если файла нет. Явный `--fingerprint`, включая `--fingerprint=off`, имеет приоритет и оставляет файл без изменений. При выключенном stealth файл не изменяется. Повреждённый файл восстанавливается с предупреждением; ошибка доступа к файлу останавливает запуск.
