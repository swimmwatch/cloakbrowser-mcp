---
description: CloakBrowser MCP 暴露的工具表面。
icon: material/tools
tags:
  - 工具
  - 用户指南
---

# 工具

`cloakbrowser-mcp` 原样暴露 upstream Playwright MCP 工具。工具名称、描述、schema、注解和响应都来自 `@playwright/mcp`。

## Upstream 工具

默认 upstream 浏览器工具表面应与固定的 Playwright MCP 依赖保持一致。它包括导航、snapshot、点击、输入、截图、标签页、控制台消息、网络检查、文件上传、对话框以及不安全求值工具等核心浏览器工具。

稳定的 upstream 参考见 Playwright MCP `{{ project.playwright_mcp_package_tag }}` capability test，该测试固定到准确的包 commit：[default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/4c1fb03bad3bae379b0ae0e3d81d2660de56bd91/tests/capabilities.spec.ts#L19-L77)。

本项目将 upstream Playwright MCP 视为权威来源，不维护复制的 schema 参考。

默认集合包含 24 个 upstream 工具。`PLAYWRIGHT_MCP_CAPS=devtools` 会将
`devtools` 能力传递给子进程，无需桥接的 `--caps` 选项；产生的 upstream 工具
和模式将不作更改地转发，其中包括 `browser_start_recording` 和
`browser_stop_recording`。

## 本地工具

### `cloakbrowser_binary_info`

返回 CloakBrowser 包、当前平台、缓存目录、预期二进制路径、安装状态以及桥接层使用的 resolved executable path 的结构化信息。

### `cloakbrowser_bridge_info`

返回结构化桥接元数据：

- MCP server 名称和版本；
- runtime 模式；
- upstream Playwright MCP 包和版本；
- upstream 工具数量；
- 本地 Cloak-specific 工具名称。

本地工具表面仍仅限于这两个诊断工具。`SessionSeats` 和 `getSessionSeats`
不会作为 MCP 工具公开，因为 CloakBrowser 0.5.10 未从其公共入口点导出该 API。

## 兼容性

CI 会构建 Docker 镜像并运行 `npm run bridge:compare`。该脚本并行启动官方 Playwright MCP 镜像和 CloakBrowser 桥接镜像，比较 upstream 工具列表，并在同一个 fixture 页面上执行默认 upstream 浏览器工具。

使用 `--report` 写入机器可读的 JSON 报告：

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI 会将该报告作为 Docker 构建和发布构建的 artifact 上传。
