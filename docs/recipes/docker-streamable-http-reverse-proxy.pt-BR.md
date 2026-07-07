---
title: "Docker Streamable HTTP atrás de proxy reverso"
description: Execute a imagem Docker do CloakBrowser MCP como servidor local Streamable HTTP para um reverse proxy com TLS.
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# Docker Streamable HTTP atrás de proxy reverso

Use este padrão quando um reverse proxy termina TLS e aplica controles de acesso.

## Iniciar o servidor

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

O contêiner escuta 0.0.0.0 internamente, mas o Docker publica a porta apenas no loopback do host.

## Proxy do endpoint

```text
http://127.0.0.1:3000/mcp
```

Reenvie Authorization e mcp-session-id sem alterações. Mantenha health probes com auth ou só em rede confiável.

## Verificar

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

## Relacionado

- [Docker](../docker.md)
- [Configuration](../configuration.md)
- [Security](../security.md)
