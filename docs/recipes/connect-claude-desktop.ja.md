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

この設定を `claude_desktop_config.json` に追加し、Claude Desktop を再起動します：

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

Claude Desktop に `cloakbrowser` サーバーでページを開き、ブラウザのスナップショットを取得させてください。上流 Playwright MCP のブラウザツールは変更されずに利用できます。

## 関連

- [はじめに](../getting-started.md#mcp-client-config)
- [永続ログインプロファイル](persistent-login-profile.md)
- [ツール](../tools.md)
