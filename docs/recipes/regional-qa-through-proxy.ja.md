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
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Streamable HTTP セッションメタデータ

1 つの Streamable HTTP サーバーで、MCP セッションごとに異なるプロキシ設定を受け付けられます：

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

既存のセッションは `initialize` 時に設定されたプロキシを維持します。地域を切り替えるには新しいセッションを開始してください。

## 確認

MCP クライアントに IP またはローカライズのテストページを開かせ、観測された地域、言語、タイムゾーンをプロキシプロバイダーの想定する所在地と比較してください。

## 関連

- [GeoIPプロキシの照合](../geoip-proxy-matching.md)
- [設定](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#geoip-proxy-matching)
