---
title: "CI スモークテスト"
description: package diagnostics と Streamable HTTP readiness を確認する軽量 CI スモークテストを追加します。
icon: material/test-tube
tags:
  - Testing
  - User Guide
---

# CI スモークテスト

スモークテストは MCP クライアント接続前に不足 runtime 依存関係を検出します。

## npm パッケージ確認

```bash
npx -y cloakbrowser-mcp@latest doctor --json
```

## Streamable HTTP プローブ

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

## Docker パッケージ確認

```bash
docker run --rm --init \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  doctor --json
```

## 関連

- [Getting Started](../getting-started.md)
- [Docker](../docker.md)
- [Testing](../testing.md)
