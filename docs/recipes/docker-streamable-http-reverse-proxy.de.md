---
title: "Docker Streamable HTTP hinter Reverse Proxy"
description: Führen Sie das CloakBrowser-MCP-Docker-Image als lokalen Streamable-HTTP-Server für einen TLS reverse proxy aus.
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# Docker Streamable HTTP hinter Reverse Proxy

Dieses Muster passt, wenn ein reverse proxy TLS beendet und Zugriffskontrollen erzwingt.

## Server starten

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Der Container lauscht intern auf 0.0.0.0, aber Docker veröffentlicht den Port nur auf dem Host-loopback.

## Endpoint proxyn

```text
http://127.0.0.1:3000/mcp
```

Leiten Sie Authorization und mcp-session-id unverändert weiter. health probes sollten auth verwenden oder nur im vertrauenswürdigen Netzwerk erreichbar sein.

## Prüfen

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

## Verwandt

- [Docker](../docker.md)
- [Configuration](../configuration.md)
- [Security](../security.md)
