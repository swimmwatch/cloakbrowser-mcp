---
title: "@playwright/mcp 与 cloakbrowser-mcp"
description: 对比 Playwright MCP upstream 与 CloakBrowser MCP 的工具一致性、CloakBrowser 执行、打包、Streamable HTTP、配置文件、扩展、区域 QA 和人性化输入。
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp 与 cloakbrowser-mcp

上游 `@playwright/mcp` 是 Playwright MCP 浏览器工具的权威服务器。`cloakbrowser-mcp` 面向需要相同工具集合、CloakBrowser Chromium 以及封装部署流程的团队。

## 功能比较

| 功能 | `@playwright/mcp` | `cloakbrowser-mcp` |
| --- | --- | --- |
| 保持上游工具不变 | 定义权威的浏览器工具模式、描述和响应。 | 原样转发上游浏览器工具，并在 CI 中检查一致性。 |
| CloakBrowser 二进制文件 | 使用上游 Playwright MCP 选择的浏览器运行时。 | 生成上游配置，将 CloakBrowser Chromium 用作可执行文件。 |
| npm 发行包 | 作为上游 Playwright MCP 包发布。 | 以 `cloakbrowser-mcp` 发布，支持 `npx` 和 MCP 客户端 stdio 配置。 |
| Docker 镜像 | 提供官方 Playwright MCP 镜像。 | 基于官方 Playwright MCP 镜像构建，并准备 CloakBrowser 运行时默认配置。 |
| Streamable HTTP | 遵循上游传输行为。 | 提供 stdio 和 Streamable HTTP，以及健康、就绪、身份验证、HTTPS 和会话元数据选项。 |
| 持久化配置文件 | 使用上游支持的浏览器状态选项。 | 验证 `PLAYWRIGHT_MCP_USER_DATA_DIR`，并在生成配置时锁定配置文件。 |
| 扩展路径 | 浏览器支持时，通过浏览器运行时配置。 | 加载已验证的 Chrome 扩展目录，并要求持久化配置文件。 |
| 上下文验证 | 取决于上游配置结构。 | 写入生成的 Playwright MCP 配置前验证受支持的上下文选项。 |
| GeoIP 区域 QA | 代理路由仍由上游负责。 | 可使 CloakBrowser 时区、语言和区域指纹标志与配置的代理位置一致。 |
| 人性化交互 | 使用标准 Playwright MCP 交互行为。 | 可通过 CloakBrowser 的人性化输入行为执行支持的页面交互。 |

## 何时选择上游 Playwright MCP

- 你需要最小的 Playwright MCP 安装；
- 不需要 CloakBrowser Chromium；
- 希望直接跟随 Playwright MCP upstream 包装。

## 何时选择 CloakBrowser MCP

- Playwright MCP 工具需要使用 CloakBrowser Chromium 运行；
- 需要 npm、Docker 或 Streamable HTTP 的文档化部署路径；
- 需要持久配置文件、扩展、上下文验证、区域 QA 或人性化输入。

## 下一步

- [入门指南](getting-started.md)
- [操作示例](recipes/index.md)
- [工具](tools.md)
