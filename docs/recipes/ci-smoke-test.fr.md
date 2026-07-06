---
title: "Test smoke CI"
description: Ajoutez un test smoke CI léger pour package diagnostics et Streamable HTTP readiness.
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# Test smoke CI

Le test smoke détecte les dépendances runtime manquantes avant la connexion d’un client MCP.

## Vérification du paquet npm

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

## Sonde Streamable HTTP

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000 &
server_pid=$!

for attempt in 1 2 3 4 5; do
  curl -fsS http://127.0.0.1:3000/readyz && break
  sleep 1
done

kill "$server_pid"
wait "$server_pid" || true
```

## Vérification du paquet Docker

```bash
docker run --rm --init \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## Liens associés

- [Getting Started](../getting-started.md)
- [Docker](../docker.md)
- [Testing](../testing.md)
