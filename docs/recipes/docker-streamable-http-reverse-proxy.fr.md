---
title: "Docker Streamable HTTP derrière un proxy inverse"
description: Exécutez l’image Docker CloakBrowser MCP comme serveur Streamable HTTP local pour un reverse proxy TLS.
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# Docker Streamable HTTP derrière un proxy inverse

Ce modèle convient lorsqu’un reverse proxy termine TLS et applique les contrôles d’accès.

## Démarrer le serveur

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Le conteneur écoute 0.0.0.0 en interne, mais Docker publie le port seulement sur le loopback hôte.

## Proxifier l’endpoint

Configurez votre proxy inverse pour transmettre le trafic HTTPS authentifié vers :

```text
http://127.0.0.1:3000/mcp
```

Transmettez les en-têtes `Authorization` et `mcp-session-id` sans modification. Réservez `/healthz` et `/readyz` aux contrôles de santé de confiance ou exigez le même jeton Bearer.

## Vérifier

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

Configurez ensuite le client MCP avec l’URL HTTPS publique, par exemple :

```text
https://mcp.example.com/mcp
```

## Liens associés

- [Docker](../docker.md#streamable-http)
- [Configuration](../configuration.md#https)
- [Sécurité](../security.md)
