---
title: Regional QA Through Proxy
description: Run regional QA by routing Playwright MCP traffic through a proxy and aligning CloakBrowser timezone, language, and locale fingerprint flags.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# Regional QA Through Proxy

Use GeoIP proxy matching when a QA task depends on a consistent network region, timezone, language, and locale profile.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Percent-encode special characters in proxy credentials before putting them in the URL.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Streamable HTTP Session Metadata

One Streamable HTTP server can accept different proxy settings per MCP session:

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

Existing sessions keep the proxy captured during `initialize`; start a new session to switch region.

## Verify

Ask the MCP client to visit an IP or localization test page and compare the observed region, language, and timezone with the proxy provider's expected location.

## Related

- [GeoIP Proxy Matching](../geoip-proxy-matching.md)
- [Configuration](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#geoip-proxy-matching)
