---
title: "Регіональне QA через проксі"
description: Спрямовуйте Playwright MCP через проксі та узгоджуйте timezone, language і locale CloakBrowser.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# Регіональне QA через проксі

Зіставлення GeoIP проксі допомагає тримати мережевий регіон і браузерний fingerprint узгодженими.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Percent-encode спеціальні символи в proxy credentials.

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Метадані сесії Streamable HTTP

Один сервер Streamable HTTP може приймати різні налаштування проксі для кожного сеансу MCP:

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

Існуючі сеанси зберігають проксі, визначений під час `initialize`; створіть новий сеанс, щоб змінити регіон.

## Перевірка

Попросіть клієнт MCP відкрити сторінку перевірки IP або локалізації та порівняти спостережуваний регіон, мову й часовий пояс з очікуваним місцезнаходженням провайдера проксі.

## Повʼязані матеріали

- [Збіг проксі-серверів за GeoIP](../geoip-proxy-matching.md)
- [Налаштування](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#geoip-proxy-matching)
