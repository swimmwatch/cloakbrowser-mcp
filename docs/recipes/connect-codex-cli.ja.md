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

サーバーを起動します：

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

起動済みのエンドポイントを登録します：

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## 確認

Codex に `cloakbrowser` サーバーの MCP ツール一覧を表示させるか、ブラウザのナビゲーションツールを使わせてください。上流 Playwright MCP のブラウザツールが `cloakbrowser_binary_info` と `cloakbrowser_bridge_info` とともに表示されます。

## 関連

- [はじめに](../getting-started.md#mcp-client-config)
- [リバースプロキシ背後の Docker Streamable HTTP](docker-streamable-http-reverse-proxy.md)
- [ツール](../tools.md)
