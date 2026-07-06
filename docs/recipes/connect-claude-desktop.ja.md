---
title: "Claude Desktop に接続"
description: stdio mcpServers configuration で CloakBrowser MCP を Claude Desktop に追加します。
icon: material/chat
tags:
  - User Guide
---

# Claude Desktop に接続

Claude Desktop が必要時にサーバーを起動する場合は stdio を使います。

## サーバーを追加

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest"]
    }
  }
}
```

## 任意の永続プロファイル

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest"],
      "env": {
        "PLAYWRIGHT_MCP_USER_DATA_DIR": "/absolute/path/to/profile"
      }
    }
  }
}
```

## 確認

Ask Claude Desktop to open a page with the cloakbrowser server and take a browser snapshot.

## 関連

- [Getting Started](../getting-started.md)
- [永続ログインプロファイル](persistent-login-profile.md)
- [Tools](../tools.md)
