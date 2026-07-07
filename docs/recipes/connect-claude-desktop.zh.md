---
title: "连接到 Claude Desktop"
description: 使用 stdio mcpServers configuration 将 CloakBrowser MCP 添加到 Claude Desktop。
icon: material/chat
tags:
  - User Guide
---

# 连接到 Claude Desktop

当 Claude Desktop 需要按需启动服务器时使用 stdio。

## 添加服务器

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

## 可选持久配置文件

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

## 验证

Ask Claude Desktop to open a page with the cloakbrowser server and take a browser snapshot.

## 相关内容

- [Getting Started](../getting-started.md)
- [持久登录配置文件](persistent-login-profile.md)
- [Tools](../tools.md)
