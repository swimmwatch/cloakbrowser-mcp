---
title: "QA régionale via proxy"
description: Routez Playwright MCP via un proxy et alignez timezone, language et locale de CloakBrowser.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# QA régionale via proxy

La correspondance GeoIP du proxy aide à garder cohérents la région réseau et le fingerprint navigateur.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Encodez les caractères spéciaux des proxy credentials avec percent-encoding.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Métadonnées de session Streamable HTTP

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

Les sessions existantes gardent le proxy capturé pendant initialize ; créez une autre session pour changer de région.

## Liens associés

- [GeoIP Proxy Matching](../geoip-proxy-matching.md)
- [Configuration](../configuration.md)
- [Docker](../docker.md)
