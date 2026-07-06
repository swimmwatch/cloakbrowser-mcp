---
title: "Docker Streamable HTTP за зворотним проксі"
description: Запустіть Docker-образ CloakBrowser MCP як локальний Streamable HTTP сервер для TLS reverse proxy.
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# Docker Streamable HTTP за зворотним проксі

Цей шаблон підходить, коли reverse proxy завершує TLS і застосовує контроль доступу.

## Запуск сервера

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Контейнер слухає 0.0.0.0 всередині, але Docker публікує порт тільки на loopback хоста.

## Проксування endpoint

```text
http://127.0.0.1:3000/mcp
```

Передавайте Authorization і mcp-session-id без змін. Health probes залишайте за auth або тільки для довіреної мережі.

## Перевірка

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

## Повʼязані матеріали

- [Docker](../docker.md)
- [Configuration](../configuration.md)
- [Security](../security.md)
