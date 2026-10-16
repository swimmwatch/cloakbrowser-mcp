---
title: "QA régionale via proxy"
description: Routez Playwright MCP via un proxy et alignez timezone, language et locale de CloakBrowser.
icon: material/map-marker-radius
tags:
  - GeoIP
  - Proxy
  - User Guide
---

# QA régionale via proxy

La correspondance GeoIP du proxy aide à garder cohérents la région réseau et le fingerprint navigateur.

## npm

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  npx -y cloakbrowser-mcp@latest
```

Encodez les caractères spéciaux des proxy credentials avec percent-encoding.

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

## Métadonnées de session Streamable HTTP

Un serveur Streamable HTTP peut accepter des paramètres de proxy différents pour chaque session MCP :

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

Les sessions existantes conservent le proxy défini lors de `initialize` ; démarrez une nouvelle session pour changer de région.

## Vérification

Demandez au client MCP de visiter une page de test IP ou de localisation et de comparer la région, la langue et le fuseau horaire observés avec l’emplacement attendu du fournisseur du proxy.

## Liens associés

- [Correspondance de proxys GeoIP](../geoip-proxy-matching.md)
- [Configuration](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#geoip-proxy-matching)
