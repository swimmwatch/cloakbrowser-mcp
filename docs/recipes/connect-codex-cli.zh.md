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

启动服务器：

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

注册已运行的端点：

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## 验证

请让 Codex 列出 `cloakbrowser` 服务器的 MCP 工具，或调用浏览器导航工具。上游 Playwright MCP 浏览器工具应与 `cloakbrowser_binary_info` 和 `cloakbrowser_bridge_info` 一起出现。

## 相关内容

- [入门指南](../getting-started.md#mcp-client-config)
- [反向代理后的 Docker Streamable HTTP](docker-streamable-http-reverse-proxy.md)
- [工具](../tools.md)
