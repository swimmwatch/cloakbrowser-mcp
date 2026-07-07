---
title: "प्रॉक्सी के माध्यम से क्षेत्रीय QA"
description: Playwright MCP को proxy से route करें और CloakBrowser timezone, language तथा locale align करें।
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# प्रॉक्सी के माध्यम से क्षेत्रीय QA

GeoIP proxy मिलान network region और browser fingerprint को consistent रखता है।

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Proxy credentials के special characters को percent-encode करें।

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Streamable HTTP session metadata

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

Existing sessions initialize के समय captured proxy रखती हैं; region बदलने के लिए नई session बनाएँ।

## संबंधित

- [GeoIP Proxy Matching](../geoip-proxy-matching.md)
- [Configuration](../configuration.md)
- [Docker](../docker.md)
