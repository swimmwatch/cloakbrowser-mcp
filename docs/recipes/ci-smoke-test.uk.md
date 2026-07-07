---
title: "Smoke-тест CI"
description: Додайте легкий smoke-тест CI для package diagnostics і Streamable HTTP readiness.
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# Smoke-тест CI

Smoke-тест ловить відсутні runtime-залежності до підключення MCP-клієнта.

## Перевірка npm-пакета

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

## Проба Streamable HTTP

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

## Перевірка Docker-пакета

```bash
docker run --rm --init \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## Повʼязані матеріали

- [Getting Started](../getting-started.md)
- [Docker](../docker.md)
- [Testing](../testing.md)
