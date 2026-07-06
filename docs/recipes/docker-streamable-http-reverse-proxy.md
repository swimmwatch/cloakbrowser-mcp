---
title: Docker Streamable HTTP Behind Reverse Proxy
description: Run the CloakBrowser MCP Docker image as a local Streamable HTTP server for a TLS-terminating reverse proxy.
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# Docker Streamable HTTP Behind Reverse Proxy

Use this pattern when a reverse proxy terminates TLS and enforces access controls, while the container listens on loopback.

## Start The Server

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

The container binds to `0.0.0.0` internally, but Docker publishes it only on host loopback.

## Proxy The Endpoint

Configure your reverse proxy to forward authenticated HTTPS traffic to:

```text
http://127.0.0.1:3000/mcp
```

Forward `Authorization` and `mcp-session-id` headers unchanged. Keep `/healthz` and `/readyz` available only to trusted health checks, or require the same bearer token.

## Verify

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

Then configure the MCP client with the public HTTPS URL, for example:

```text
https://mcp.example.com/mcp
```

## Related

- [Docker](../docker.md#streamable-http)
- [Configuration](../configuration.md#https)
- [Security](../security.md)
