---
title: Региональный QA Через прокси
description: Запустите региональный QA, перенаправив трафик Playwright MCP через прокси-сервер и выровняв флаги часового пояса, языка и локали CloakBrowser.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# Региональный QA через прокси

Используйте сопоставление прокси-сервера GeoIP, если задача QA зависит от согласованного сетевого региона, часового пояса, языка и профиля локали.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Процентное кодирование специальных символов в учетных данных прокси-сервера перед их размещением в URL-адресе.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Streamable HTTP Метаданные сеанса

Один сервер Streamable HTTP может принимать разные настройки прокси-сервера для каждого сеанса MCP:

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

Существующие сеансы сохраняют захват прокси во время `initialize`; начать новый сеанс для переключения региона.

## Проверять

Попросите клиента MCP посетить тестовую страницу IP или локализации и сравнить наблюдаемый регион, язык и часовой пояс с ожидаемым местоположением прокси-провайдера.

## Связанный

- [GeoIP Сопоставление прокси](../geoip-proxy-matching.md)
- [Конфигурация](../configuration.md)
- [Docker](../docker.md)