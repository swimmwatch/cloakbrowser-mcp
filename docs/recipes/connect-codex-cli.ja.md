---
title: "Codex CLI に接続"
description: stdio または Streamable HTTP で CloakBrowser MCP を Codex CLI に登録します。
icon: material/console
tags:
  - User Guide
---

# Codex CLI に接続

Codex がこのマシンで CloakBrowser MCP を起動する場合は stdio を使います。

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## 確認

Ask Codex to list the cloakbrowser MCP tools or run a browser navigation tool.

## 関連

- [Getting Started](../getting-started.md)
- [リバースプロキシ背後の Docker Streamable HTTP](docker-streamable-http-reverse-proxy.md)
- [Tools](../tools.md)
