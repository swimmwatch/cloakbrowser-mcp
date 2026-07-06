---
title: "QA regional mediante proxy"
description: Enruta Playwright MCP por un proxy y alinea timezone, language y locale de CloakBrowser.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# QA regional mediante proxy

La correspondencia GeoIP del proxy ayuda a mantener coherentes la región de red y el fingerprint del navegador.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Aplica percent-encoding a caracteres especiales en las credenciales del proxy.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Metadatos de sesión Streamable HTTP

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

Las sesiones existentes conservan el proxy capturado durante initialize; crea otra sesión para cambiar de región.

## Relacionado

- [GeoIP Proxy Matching](../geoip-proxy-matching.md)
- [Configuration](../configuration.md)
- [Docker](../docker.md)
