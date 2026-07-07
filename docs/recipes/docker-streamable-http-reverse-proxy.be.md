---
title: Docker Streamable HTTP Ззаду зваротнага проксі
description: Запусціце выяву CloakBrowser MCP Docker як лакальны сервер Streamable HTTP для TLS, які спыняе зваротны проксі.
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# Docker Streamable HTTP Ззаду зваротнага проксі

Выкарыстоўвайце гэты шаблон, калі зваротны проксі спыняе TLS і выконвае элементы кіравання доступам, у той час як кантэйнер слухае зваротны ход.

## Запусціць сервер

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Кантэйнер звязваецца з `0.0.0.0` унутрана, але Docker публікуе яго толькі на зваротным хосце.

## Канчатковая кропка проксі

Настаўленне зваротнага проксі для перадачы аўтэнтыфікаванага трафіку HTTPS у:

```text
http://127.0.0.1:3000/mcp
```

Наперад загалоўкі `Authorization` і `mcp-session-id` нязменныя. Трымаеце `/healthz` і `/readyz` даступныя толькі для правераных медыцынскіх аглядаў або патрабуюць таго ж маркера носьбіта.

## Праверыць

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

Затым наладзіць кліент MCP з агульнадаступным URL-адрасам HTTPS, напрыклад:

```text
https://mcp.example.com/mcp
```

## ЗВЯЗАНАЕ

- [Docker](../docker.md)
- [Configuration](../configuration.md)
- [Security](../security.md)
