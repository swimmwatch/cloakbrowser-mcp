---
title: "永続ログインプロファイル"
description: 永続プロファイルディレクトリで CloakBrowser cookies、local storage、キャッシュ、拡張機能状態を再利用します。
icon: material/account-key
tags:
  - User Guide
---

# 永続ログインプロファイル

永続プロファイルはブラウザーセッション間でログイン状態を保持します。

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

同じコマンドで MCP クライアントを設定します。1 つのプロファイルディレクトリを複数のアクティブサーバーで共有しないでください。

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

環境変数ではコンテナパスを使います。ホストパスは volume mount にだけ指定します。

## 確認

1. Sign in once.
2. Restart with the same PLAYWRIGHT_MCP_USER_DATA_DIR.
3. Confirm the session remains active.

## 関連

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Chrome 拡張機能を読み込む](load-chrome-extension.md)
