---
title: CI Испытание на дым
description: Добавьте облегченный дымовой тест CI, который проверяет диагностику пакета CloakBrowser MCP и Streamable HTTP readiness.
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# CI Испытание на дым

Используйте дымовой тест, чтобы выявить недостающие зависимости времени выполнения, прежде чем клиент MCP попытается использовать инструменты браузера.

## npm Проверка пакета

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

При этом проверяется Node.js, метаданные пакета, upstream Playwright MCP разрешение CLI и двоичные метаданные CloakBrowser без запуска моста.

## Streamable HTTP Зонд

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000 &
server_pid=$!

for attempt in 1 2 3 4 5; do
  curl -fsS http://127.0.0.1:3000/readyz && break
  sleep 1
done

kill "$server_pid"
wait "$server_pid" || true
```

Используйте это только в недолговечных заданиях CI. Для дымовых тестов, аналогичных производственным, запустите ту же проверку для образа Docker и точки входа развертывания, которую вы фактически отправляете.

## Docker Проверка пакета

```bash
docker run --rm --init \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## Связанный

- [Начало работы](../getting-started.md)
- [Docker](../docker.md)
- [Тестирование](../testing.md)