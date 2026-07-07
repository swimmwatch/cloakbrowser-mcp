---
title: "加载 Chrome 扩展"
description: 使用持久配置文件将解压的 Chrome 扩展加载到 CloakBrowser MCP。
icon: material/puzzle
tags:
  - User Guide
---

# 加载 Chrome 扩展

Chrome 扩展需要解压目录和持久配置文件。

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

多个 path、逗号或 Windows drive-letter paths 请使用 JSON array。

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

更改扩展文件或路径后重新启动服务器。

## 验证

Use the MCP client to open a page where the extension should be active, then inspect behavior or capture a screenshot.

## 相关内容

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [持久登录配置文件](persistent-login-profile.md)
