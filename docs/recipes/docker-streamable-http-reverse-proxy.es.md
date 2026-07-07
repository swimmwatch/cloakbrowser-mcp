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

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

El contenedor escucha en 0.0.0.0 internamente, pero Docker publica el puerto solo en loopback del host.

## Proxy del endpoint

```text
http://127.0.0.1:3000/mcp
```

Reenvía Authorization y mcp-session-id sin cambios. Mantén los health probes con auth o solo en una red confiable.

## Verificar

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

## Relacionado

- [Docker](../docker.md)
- [Configuration](../configuration.md)
- [Security](../security.md)
