---
title: "リバースプロキシ背後の Docker Streamable HTTP"
description: CloakBrowser MCP Docker イメージを TLS reverse proxy 用のローカル Streamable HTTP サーバーとして実行します。
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# リバースプロキシ背後の Docker Streamable HTTP

reverse proxy が TLS を終端しアクセス制御を行う場合のパターンです。

## サーバーを起動

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

コンテナ内部では 0.0.0.0 を listen しますが、Docker はホスト loopback にだけ公開します。

## endpoint をプロキシ

```text
http://127.0.0.1:3000/mcp
```

Authorization と mcp-session-id を変更せず転送します。health probes は auth 付き、または信頼ネットワークだけにします。

## 確認

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

## 関連

- [Docker](../docker.md)
- [Configuration](../configuration.md)
- [Security](../security.md)
