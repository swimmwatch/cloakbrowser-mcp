---
title: "通过代理进行区域 QA"
description: 通过代理路由 Playwright MCP，并对齐 CloakBrowser 的 timezone、language 和 locale。
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# 通过代理进行区域 QA

GeoIP 代理匹配帮助保持网络区域和浏览器 fingerprint 一致。

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

对 proxy credentials 中的特殊字符执行 percent-encoding。

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Streamable HTTP 会话元数据

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

现有会话保留 initialize 时捕获的 proxy；要切换区域请创建新会话。

## 相关内容

- [GeoIP Proxy Matching](../geoip-proxy-matching.md)
- [Configuration](../configuration.md)
- [Docker](../docker.md)
