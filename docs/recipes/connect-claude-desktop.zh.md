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

将此配置项添加到 `claude_desktop_config.json`，然后重启 Claude Desktop：

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

请让 Claude Desktop 使用 `cloakbrowser` 服务器打开页面并获取浏览器快照。上游 Playwright MCP 浏览器工具应保持不变并可正常使用。

## 相关内容

- [入门指南](../getting-started.md#mcp-client-config)
- [持久登录配置文件](persistent-login-profile.md)
- [工具](../tools.md)
