---
title: "CI-Smoke-Test"
description: Fügen Sie einen leichten CI-Smoke-Test für package diagnostics und Streamable HTTP readiness hinzu.
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# CI-Smoke-Test

Der Smoke-Test findet fehlende runtime-Abhängigkeiten, bevor ein MCP-Client verbunden wird.

## npm-Paketprüfung

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

## Streamable-HTTP-Probe

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

## Docker-Paketprüfung

```bash
docker run --rm --init \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## Verwandt

- [Getting Started](../getting-started.md)
- [Docker](../docker.md)
- [Testing](../testing.md)
