---
title: "Docker Streamable HTTP detrás de proxy inverso"
description: Ejecuta la imagen Docker de CloakBrowser MCP como servidor local Streamable HTTP para un reverse proxy con TLS.
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# Docker Streamable HTTP detrás de proxy inverso

Este patrón sirve cuando un reverse proxy termina TLS y aplica controles de acceso.

## Iniciar el servidor

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

El contenedor escucha en 0.0.0.0 internamente, pero Docker publica el puerto solo en loopback del host.

## Proxy del endpoint

Configura tu proxy inverso para reenviar el tráfico HTTPS autenticado a:

```text
http://127.0.0.1:3000/mcp
```

Reenvía las cabeceras `Authorization` y `mcp-session-id` sin cambios. Permite el acceso a `/healthz` y `/readyz` solo a comprobaciones de estado de confianza o exige el mismo token Bearer.

## Verificar

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

Después, configure el cliente MCP con la URL HTTPS pública, por ejemplo:

```text
https://mcp.example.com/mcp
```

## Relacionado

- [Docker](../docker.md#streamable-http)
- [Configuración](../configuration.md#https)
- [Seguridad](../security.md)
