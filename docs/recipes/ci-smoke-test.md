---
title: CI Smoke Test
description: Add a lightweight CI smoke test that verifies CloakBrowser MCP package diagnostics and Streamable HTTP readiness.
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# CI Smoke Test

Use a smoke test to catch missing runtime dependencies before an MCP client tries to use browser tools.

## npm Package Check

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

This verifies Node.js, package metadata, upstream Playwright MCP CLI resolution, and CloakBrowser binary metadata without starting the bridge.

## Streamable HTTP Probe

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

Use this only in a short-lived CI job. For production-like smoke tests, run the same probe against the Docker image and the deployment entrypoint you actually ship.

## Docker Package Check

```bash
docker run --rm --init \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## Related

- [Getting Started](../getting-started.md)
- [Docker](../docker.md#build-locally)
- [Testing](../testing.md)
