---
title: "反向代理后的 Docker Streamable HTTP"
description: 将 CloakBrowser MCP Docker 镜像作为本地 Streamable HTTP 服务器，供 TLS reverse proxy 使用。
icon: material/server-network
tags:
  - Docker
  - User Guide
---

# 反向代理后的 Docker Streamable HTTP

当 reverse proxy 终止 TLS 并执行访问控制时使用此模式。

## 启动服务器

```bash
export MCP_AUTH_TOKEN="replace-with-a-secret-token"

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

容器内部监听 0.0.0.0，但 Docker 只在主机 loopback 上发布端口。

## 代理 endpoint

```text
http://127.0.0.1:3000/mcp
```

原样转发 Authorization 和 mcp-session-id。health probes 应保留 auth 或仅限可信网络。

## 验证

```bash
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/healthz
curl -H "Authorization: Bearer $MCP_AUTH_TOKEN" http://127.0.0.1:3000/readyz
```

## 相关内容

- [Docker](../docker.md)
- [Configuration](../configuration.md)
- [Security](../security.md)
