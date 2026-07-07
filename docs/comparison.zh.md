---
title: "@playwright/mcp 与 cloakbrowser-mcp"
description: 对比 Playwright MCP upstream 与 CloakBrowser MCP 的工具一致性、CloakBrowser 执行、打包、Streamable HTTP、配置文件、扩展、区域 QA 和人性化输入。
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp 与 cloakbrowser-mcp

Upstream @playwright/mcp 是 Playwright MCP 浏览器工具的权威服务器。cloakbrowser-mcp 保持该工具表面不变，但使用 CloakBrowser Chromium 和打包部署流程运行它。

## 功能

| 功能 | @playwright/mcp | cloakbrowser-mcp |
| --- | --- | --- |
| Upstream tools | Canonical browser tool surface. | Forwarded unchanged with parity checks. |
| CloakBrowser Chromium | Uses upstream selected browser runtime. | Runs upstream tools with CloakBrowser Chromium. |
| npm / Docker | Use upstream package and image. | Adds package and image paths for CloakBrowser deployment. |
| Streamable HTTP | Follows upstream transport behavior. | Adds packaged health, readiness, auth, HTTPS, and session metadata options. |
| Profiles / extensions | Use upstream browser state options. | Adds validated persistent profiles and extension paths. |
| Regional QA / humanized input | Standard Playwright MCP behavior. | Adds GeoIP helpers and optional humanized interactions. |

## 何时选择 upstream

- 你需要最小的 Playwright MCP 安装；
- 不需要 CloakBrowser Chromium；
- 希望直接跟随 Playwright MCP upstream 包装。

## 何时选择 CloakBrowser MCP

- Playwright MCP 工具需要使用 CloakBrowser Chromium 运行；
- 需要 npm、Docker 或 Streamable HTTP 的文档化部署路径；
- 需要持久配置文件、扩展、上下文验证、区域 QA 或人性化输入。

## 下一步

- [Getting Started](getting-started.md)
- [Recipes](recipes/index.md)
- [Tools](tools.md)
