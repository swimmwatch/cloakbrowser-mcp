---
description: 关于 CloakBrowser MCP 安装、Docker 使用、Playwright MCP 兼容性以及安全性的常见问题。
icon: material/help-circle
tags:
  - User Guide
---

# 常见问题解答

## 什么是 CloakBrowser MCP？

CloakBrowser MCP 是一个用于通过 stdio 或 Streamable HTTP 实现浏览器自动化的 [模型上下文协议](https://modelcontextprotocol.io/) 服务器。 它运行在 [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) 上游运行，并将 Playwright MCP 浏览器启动配置指向 [CloakBrowser](https://github.com/CloakHQ/CloakBrowser) Chromium 二进制文件。

## 它与上游的 Playwright MCP 有什么不同？

上游的 Playwright MCP 服务器负责管理浏览器工具的模式、描述和响应。CloakBrowser MCP 保持这些工具不变，仅添加了两个本地内省工具： `cloakbrowser_binary_info` 和 `cloakbrowser_bridge_info`。

## 我应该通过 npm 还是 Docker 安装它？

当您的 MCP 客户端已在本地运行，且系统已安装 Node.js 22.12 或更高版本时，请使用 npm。如果您需要一个可重复使用的基于 Playwright MCP 的镜像，且容器内部已预先配置好 CloakBrowser 缓存，请使用 Docker。

## 哪些 MCP 客户端可以使用该功能？

任何支持 stdio 或 Streamable HTTP 服务器的 MCP 客户端均可使用 CloakBrowser MCP。该 [入门指南](getting-started.md) 指南中包含了适用于 Codex、Claude Desktop、Claude Code、Cursor、VS Code/Cline 风格客户端、Continue、Windsurf、Goose 以及 Warp 风格配置的 stdio JSON 示例。

## 它是否支持与 Playwright MCP 相同的浏览器工具？

是的。上游 Playwright MCP 浏览器工具会原样转发。该项目还在持续集成（CI）中运行一致性比较，以便将桥接组件的更改与官方 Playwright MCP 的行为进行核对。

## Docker 能否提高安全性？

Docker 为您提供了更具可重复性和隔离性的运行时环境，但这并不意味着浏览器自动化就完全没有风险。请将自动化浏览视为不可信的执行环境： 避免与未知网页共享机密信息，将构建产物和截图保存在受控目录中，并在将服务器暴露给其他系统之前，请仔细阅读 [安全](security.md) 指南。

## 该项目是否使用分析或跟踪功能？

不。该文档网站默认未启用分析功能。搜索引擎的检索通过标准元数据、`robots.txt`、网站地图生成、可选的网站管理员验证标签以及可选的 IndexNow 通知来实现。

## 更多实用路径

要在 upstream Playwright MCP 和本包之间选择，请查看[对比](comparison.md)。快速任务请使用[操作示例](recipes/index.md)：持久配置文件、扩展、reverse proxy、区域 QA、Claude Desktop、Codex CLI 和 CI 冒烟测试。
