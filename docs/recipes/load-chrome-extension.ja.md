---
title: "Chrome 拡張機能を読み込む"
description: 永続プロファイルを使って展開済み Chrome 拡張機能を CloakBrowser MCP に読み込みます。
icon: material/puzzle
tags:
  - User Guide
---

# Chrome 拡張機能を読み込む

Chrome 拡張機能には展開済みディレクトリと永続プロファイルが必要です。

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

複数 path、カンマ、Windows drive-letter paths には JSON array を使います。

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

拡張機能ファイルまたはパスを変更したらサーバーを再起動します。

## 確認

Use the MCP client to open a page where the extension should be active, then inspect behavior or capture a screenshot.

## 関連

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [永続ログインプロファイル](persistent-login-profile.md)
