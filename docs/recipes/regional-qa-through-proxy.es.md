---
title: "QA regional mediante proxy"
description: Enruta Playwright MCP por un proxy y alinea timezone, language y locale de CloakBrowser.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# QA regional mediante proxy

La correspondencia GeoIP del proxy ayuda a mantener coherentes la región de red y el fingerprint del navegador.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Aplica percent-encoding a caracteres especiales en las credenciales del proxy.

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Metadatos de sesión Streamable HTTP

Un servidor Streamable HTTP puede aceptar una configuración de proxy distinta por sesión MCP:

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

Las sesiones existentes conservan el proxy registrado durante `initialize`; inicie una sesión nueva para cambiar de región.

## Verificación

Pida al cliente MCP que visite una página de prueba de IP o localización y compare la región, el idioma y la zona horaria observados con la ubicación esperada del proveedor del proxy.

## Relacionado

- [Coincidencia de proxies GeoIP](../geoip-proxy-matching.md)
- [Configuración](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#geoip-proxy-matching)
