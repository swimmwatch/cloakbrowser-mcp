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

docker run --rm -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

コンテナ内部では 0.0.0.0 を listen しますが、Docker はホスト loopback にだけ公開します。

## endpoint をプロキシ

認証済みの HTTPS トラフィックを以下の宛先に転送するよう、リバースプロキシを設定してください：

```text
http://127.0.0.1:3000/mcp
```

`Authorization` と `mcp-session-id` ヘッダーを変更せずに転送してください。`/healthz` と `/readyz` は信頼できるヘルスチェックからのみアクセスできるようにするか、同じ Bearer トークンを必須にしてください。

## 確認

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

次に、MCP クライアントに公開 HTTPS URL を設定します。例：

```text
https://mcp.example.com/mcp
```

## 関連

- [Docker](../docker.md#streamable-http)
- [設定](../configuration.md#https)
- [セキュリティ](../security.md)
