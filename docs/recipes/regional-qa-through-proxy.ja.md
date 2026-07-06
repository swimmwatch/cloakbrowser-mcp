---
title: "プロキシ経由のリージョン QA"
description: Playwright MCP をプロキシ経由にし、CloakBrowser の timezone、language、locale を合わせます。
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# プロキシ経由のリージョン QA

GeoIP プロキシ照合はネットワーク地域とブラウザー fingerprint の整合性を保ちます。

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

proxy credentials の特殊文字は percent-encoding してください。

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Streamable HTTP セッションメタデータ

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

既存セッションは initialize 時の proxy を保持します。地域を変えるには新しいセッションを作ります。

## 関連

- [GeoIP Proxy Matching](../geoip-proxy-matching.md)
- [Configuration](../configuration.md)
- [Docker](../docker.md)
