---
title: "Regionale QA über Proxy"
description: Routen Sie Playwright MCP über einen Proxy und gleichen Sie timezone, language und locale von CloakBrowser ab.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# Regionale QA über Proxy

Der GeoIP-Proxy-Abgleich hält Netzwerkregion und Browser-fingerprint konsistent.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Kodieren Sie Sonderzeichen in proxy credentials per percent-encoding.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Streamable-HTTP-Sitzungsmetadaten

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

Bestehende Sitzungen behalten den proxy aus initialize; erstellen Sie eine neue Sitzung, um die Region zu wechseln.

## Verwandt

- [GeoIP Proxy Matching](../geoip-proxy-matching.md)
- [Configuration](../configuration.md)
- [Docker](../docker.md)
