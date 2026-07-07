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
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Используйте пути к контейнерам в переменных среды. Путь к хосту используется только при монтировании `-v`.

## Проверять

1. Попросите клиент MCP открыть страницу входа и войти в систему.
2. Остановите сервер начисто.
3. Запускаем заново с тем же `PLAYWRIGHT_MCP_USER_DATA_DIR`.
4. Попросите клиента снова посетить сайт и убедиться, что состояние входа в систему все еще присутствует.

## Связанный

- [Конфигурация](../configuration.md)
- [Docker](../docker.md)
- [Загрузить расширение Chrome](load-chrome-extension.md)