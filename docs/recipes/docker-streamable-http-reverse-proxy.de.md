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

docker run --rm -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Der Container lauscht intern auf 0.0.0.0, aber Docker veröffentlicht den Port nur auf dem Host-loopback.

## Endpoint proxyn

Konfigurieren Sie Ihren Reverse Proxy so, dass er authentifizierten HTTPS-Verkehr an folgende Adresse weiterleitet:

```text
http://127.0.0.1:3000/mcp
```

Leiten Sie die Header `Authorization` und `mcp-session-id` unverändert weiter. Machen Sie `/healthz` und `/readyz` nur vertrauenswürdigen Zustandsprüfungen zugänglich oder verlangen Sie denselben Bearer-Token.

## Prüfen

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

Konfigurieren Sie anschließend den MCP-Client mit der öffentlichen HTTPS-URL, zum Beispiel:

```text
https://mcp.example.com/mcp
```

## Verwandt

- [Docker](../docker.md#streamable-http)
- [Konfiguration](../configuration.md#https)
- [Sicherheit](../security.md)
