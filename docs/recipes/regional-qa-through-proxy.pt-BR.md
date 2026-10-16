---
title: "QA regional via proxy"
description: Roteie o Playwright MCP por um proxy e alinhe timezone, language e locale do CloakBrowser.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# QA regional via proxy

A correspondência GeoIP do proxy ajuda a manter coerentes a região de rede e o fingerprint do navegador.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Aplique percent-encoding a caracteres especiais nas credenciais do proxy.

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Metadados de sessão Streamable HTTP

Um servidor Streamable HTTP pode aceitar configurações de proxy diferentes por sessão MCP:

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

As sessões existentes mantêm o proxy definido durante `initialize`; inicie uma nova sessão para mudar de região.

## Verificação

Peça ao cliente MCP para visitar uma página de teste de IP ou localização e comparar a região, o idioma e o fuso horário observados com a localização esperada pelo provedor do proxy.

## Relacionado

- [Correspondência de proxy por GeoIP](../geoip-proxy-matching.md)
- [Configuração](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#geoip-proxy-matching)
