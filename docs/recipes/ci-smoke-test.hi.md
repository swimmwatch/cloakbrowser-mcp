---
title: "CI स्मोक टेस्ट"
description: package diagnostics और Streamable HTTP readiness के लिए lightweight CI smoke test जोड़ें।
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# CI स्मोक टेस्ट

Smoke test MCP client connect होने से पहले missing runtime dependencies पकड़ता है।

## npm package check

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

यह ब्रिज शुरू किए बिना Node.js, पैकेज मेटाडेटा, प्रभावी upstream Playwright MCP CLI, `@playwright/mcp`, `playwright` और `playwright-core` के resolve किए गए version और package path, प्रभावी core bundle path तथा CloakBrowser binary metadata की जाँच करता है।

## Streamable HTTP probe

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

## Docker package check

```bash
docker run --rm --init \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## संबंधित

- [Getting Started](../getting-started.md)
- [Docker](../docker.md)
- [Testing](../testing.md)
