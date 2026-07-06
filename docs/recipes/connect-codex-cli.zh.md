---
title: "连接到 Codex CLI"
description: 通过 stdio 或 Streamable HTTP 在 Codex CLI 中注册 CloakBrowser MCP。
icon: material/console
tags:
  - User Guide
---

# 连接到 Codex CLI

当 Codex 需要在当前机器启动 CloakBrowser MCP 时使用 stdio。

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## 验证

Ask Codex to list the cloakbrowser MCP tools or run a browser navigation tool.

## 相关内容

- [Getting Started](../getting-started.md)
- [反向代理后的 Docker Streamable HTTP](docker-streamable-http-reverse-proxy.md)
- [Tools](../tools.md)
