---
title: "Teste smoke de CI"
description: Adicione um teste smoke leve de CI para package diagnostics e Streamable HTTP readiness.
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# Teste smoke de CI

O smoke test detecta dependências runtime ausentes antes de conectar um cliente MCP.

## Verificação do pacote npm

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

## Verificação do pacote Docker

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
