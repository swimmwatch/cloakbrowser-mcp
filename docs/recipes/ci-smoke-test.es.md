---
title: "Prueba smoke de CI"
description: Añade una prueba smoke ligera de CI para package diagnostics y Streamable HTTP readiness.
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# Prueba smoke de CI

La prueba smoke detecta dependencias runtime faltantes antes de conectar un cliente MCP.

## Comprobación del paquete npm

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

## Sonda Streamable HTTP

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

## Comprobación del paquete Docker

```bash
docker run --rm --init \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## Relacionado

- [Getting Started](../getting-started.md)
- [Docker](../docker.md)
- [Testing](../testing.md)
