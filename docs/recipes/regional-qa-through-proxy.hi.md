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
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Streamable HTTP session metadata

एक Streamable HTTP सर्वर हर MCP सत्र के लिए अलग प्रॉक्सी सेटिंग स्वीकार कर सकता है:

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

मौजूदा सत्र `initialize` के दौरान निर्धारित प्रॉक्सी रखते हैं; क्षेत्र बदलने के लिए नया सत्र शुरू करें।

## सत्यापन

MCP क्लाइंट से IP या स्थानीयकरण परीक्षण पेज खोलने को कहें और दिखाई देने वाले क्षेत्र, भाषा तथा समय क्षेत्र की तुलना प्रॉक्सी प्रदाता के अपेक्षित स्थान से करें।

## संबंधित

- [GeoIP प्रॉक्सी मिलान](../geoip-proxy-matching.md)
- [विन्यास](../configuration.md#streamable-http-runtime-metadata)
- [डॉकर](../docker.md#geoip-proxy-matching)
