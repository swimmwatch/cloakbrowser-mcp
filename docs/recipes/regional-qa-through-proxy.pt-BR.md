---
title: "QA regional via proxy"
description: Roteie o Playwright MCP por um proxy e alinhe timezone, language e locale do CloakBrowser.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# QA regional via proxy

A correspondência GeoIP do proxy ajuda a manter coerentes a região de rede e o fingerprint do navegador.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Aplique percent-encoding a caracteres especiais nas credenciais do proxy.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Metadados de sessão Streamable HTTP

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true
      }
    }
  }
}
```

Sessões existentes mantêm o proxy capturado durante initialize; crie outra sessão para mudar de região.

## Relacionado

- [GeoIP Proxy Matching](../geoip-proxy-matching.md)
- [Configuration](../configuration.md)
- [Docker](../docker.md)
