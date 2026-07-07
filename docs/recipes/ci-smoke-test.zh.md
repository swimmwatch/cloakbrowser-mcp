---
title: "CI 冒烟测试"
description: 添加轻量 CI 冒烟测试，检查 package diagnostics 和 Streamable HTTP readiness。
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# CI 冒烟测试

冒烟测试会在连接 MCP 客户端前发现缺失的 runtime 依赖。

## npm 包检查

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

## Streamable HTTP 探针

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

## Docker 包检查

```bash
docker run --rm --init \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## 相关内容

- [Getting Started](../getting-started.md)
- [Docker](../docker.md)
- [Testing](../testing.md)
