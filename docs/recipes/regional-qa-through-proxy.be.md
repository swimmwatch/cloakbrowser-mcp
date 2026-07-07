---
title: Рэгіянальны QA праз проксі
description: Запусціце рэгіянальны QA шляхам маршрутызацыі трафіку Playwright MCP праз проксі-сервер і выраўноўвання гадзіннага пояса CloakBrowser, мовы і лакальных сцягоў адбіткаў пальцаў.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# Рэгіянальны QA праз проксі

Выкарыстоўвайце адпаведнасць проксі-сервера GeoIP, калі задача QA залежыць ад паслядоўнага сеткавага рэгіёну, гадзіннага пояса, мовы і профілю месцазнаходжання.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Працэнт кадзіраваць спецыяльныя сімвалы ў уліковых запісах проксі, перш чым змясціць іх у URL.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Метададзеныя сеансу Streamable HTTP

Адзін сервер Streamable HTTP можа прымаць розныя налады проксі на сеанс MCP:

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

Існуючыя сеансы захоўваюць зафіксаваны проксі-сервер падчас `initialize`; пачаць новую сесію, каб пераключыць рэгіён.

## Праверыць

Папытаеце кліента MCP наведаць тэставую старонку IP або лакалізацыі і параўнаць назіраны рэгіён, мову і гадзінны пояс з чаканым месцам правайдэра проксі.

## ЗВЯЗАНАЕ

- [GeoIP Proxy Matching](../geoip-proxy-matching.md)
- [Configuration](../configuration.md)
- [Docker](../docker.md)
