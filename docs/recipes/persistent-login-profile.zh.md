---
title: "持久登录配置文件"
description: 通过持久配置文件目录复用 CloakBrowser cookies、local storage、缓存和扩展状态。
icon: material/account-key
tags:
  - User Guide
---

# 持久登录配置文件

持久配置文件会在浏览器会话之间保留登录状态。

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

用同一命令配置 MCP 客户端。不要在两个活动服务器之间共享一个配置文件目录。

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

环境变量中使用容器路径；主机路径只出现在 volume mount 中。

## 验证

1. Sign in once.
2. Restart with the same PLAYWRIGHT_MCP_USER_DATA_DIR.
3. Confirm the session remains active.

## 相关内容

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [加载 Chrome 扩展](load-chrome-extension.md)
