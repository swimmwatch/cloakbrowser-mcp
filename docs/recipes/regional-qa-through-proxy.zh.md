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
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Streamable HTTP 会话元数据

一个 Streamable HTTP 服务器可以为每个 MCP 会话接受不同的代理设置：

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

现有会话保留 `initialize` 时确定的代理；如需切换地区，请启动新会话。

## 验证

让 MCP 客户端访问 IP 或本地化测试页面，并将观察到的地区、语言和时区与代理提供商的预期位置进行比较。

## 相关内容

- [GeoIP 代理匹配](../geoip-proxy-matching.md)
- [配置](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#geoip-proxy-matching)
