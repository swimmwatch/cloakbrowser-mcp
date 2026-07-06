---
title: Docker Streamable HTTP За обратным прокси
description: Запустите образ CloakBrowser MCP Docker в качестве локального сервера Streamable HTTP для обратного прокси-сервера, завершающегося TLS.
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# Docker Streamable HTTP За обратным прокси

Используйте этот шаблон, когда обратный прокси-сервер завершает работу TLS и применяет контроль доступа, в то время как контейнер прослушивает петлю.

## Запускаем сервер

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Контейнер привязывается к `0.0.0.0` внутри, но Docker публикует его только при обратной связи хоста.

## Прокси Конечная точка

Настройте обратный прокси-сервер для пересылки аутентифицированного трафика HTTPS на:

```text
http://127.0.0.1:3000/mcp
```

Пересылать заголовки `Authorization` и `mcp-session-id` без изменений. Оставляйте `/healthz` и `/readyz` доступными только для доверенных проверок health или требуйте один и тот же токен на предъявителя.

## Проверять

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

Затем настройте клиент MCP с общедоступным URL-адресом HTTPS, например:

```text
https://mcp.example.com/mcp
```

## Связанный

- [Docker](../docker.md)
- [Конфигурация](../configuration.md)
- [Безопасность](../security.md)