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
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

环境变量中使用容器路径；主机路径只出现在 volume mount 中。

## 验证

1. 请让 MCP 客户端打开登录页面并登录。
2. 正常停止服务器。
3. 使用相同的 `PLAYWRIGHT_MCP_USER_DATA_DIR` 再次启动服务器。
4. 请让客户端重新访问网站，确认登录状态仍保留。

## 相关内容

- [配置](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#persistent-profiles)
- [加载 Chrome 扩展](load-chrome-extension.md)

## CloakBrowser 0.6.0

启用 CloakBrowser stealth 时，显式配置的持久配置文件会将指纹种子保存在 `.cloakbrowser-seed` 中。升级后的首次启动会在文件缺失时分配种子。显式的 `--fingerprint`（包括 `--fingerprint=off`）优先，且不会修改该文件。禁用 stealth 时不会修改种子文件。损坏的文件会重新生成并发出警告；文件访问失败会阻止启动。
