---
title: Docker Streamable HTTP за зваротным праксі
description: Запусціце Docker-вобраз CloakBrowser MCP як лакальны сервер Streamable HTTP для зваротнага проксі, які завяршае TLS-злучэнні.
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# Docker Streamable HTTP за зваротным праксі

Выкарыстоўвайце гэты шаблон, калі зваротны проксі завяршае TLS-злучэнні і кантралюе доступ, а кантэйнер слухае толькі на loopback-адрасе.

## Запусціць сервер

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Кантэйнер прывязваецца да `0.0.0.0` унутры, але Docker публікуе яго толькі на loopback-адрасе хоста.

## Канчатковая кропка проксі

Настаўленне зваротнага проксі для перадачы аўтэнтыфікаванага трафіку HTTPS у:

```text
http://127.0.0.1:3000/mcp
```

Перадавайце загалоўкі `Authorization` і `mcp-session-id` без змен. Дазваляйце доступ да `/healthz` і `/readyz` толькі давераным праверкам працаздольнасці або патрабуйце той жа bearer-токен.

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

- [Докер](../docker.md#streamable-http)
- [Канфігурацыя](../configuration.md#https)
- [Бяспека](../security.md)
