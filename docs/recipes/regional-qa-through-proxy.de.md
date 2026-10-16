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
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Streamable-HTTP-Sitzungsmetadaten

Ein Streamable-HTTP-Server kann für jede MCP-Sitzung unterschiedliche Proxy-Einstellungen annehmen:

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

Bestehende Sitzungen behalten den bei `initialize` festgelegten Proxy; starten Sie eine neue Sitzung, um die Region zu wechseln.

## Prüfen

Bitten Sie den MCP-Client, eine IP- oder Lokalisierungstestseite aufzurufen, und vergleichen Sie die beobachtete Region, Sprache und Zeitzone mit dem erwarteten Standort des Proxy-Anbieters.

## Verwandt

- [GeoIP-Proxy-Abgleich](../geoip-proxy-matching.md)
- [Konfiguration](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#geoip-proxy-matching)
