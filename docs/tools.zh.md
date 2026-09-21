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

稳定的 upstream 参考见 Playwright MCP `{{ project.playwright_mcp_package_tag }}` capability test，该测试固定到准确的包 commit：[default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/tests/capabilities.spec.ts#L19-L77)。

本项目将 upstream Playwright MCP 视为权威来源，不维护复制的 schema 参考。

默认集合包含 25 个 upstream 工具，包括 `browser_emulate_media`。`PLAYWRIGHT_MCP_CAPS=devtools` 会将
`devtools` 能力传递给子进程，无需桥接的 `--caps` 选项；产生的 upstream 工具
和模式将不作更改地转发，其中包括 `browser_start_recording` 和
`browser_stop_recording`。

!!! warning "使用公开 CloakBrowser v146 二进制文件时的录制限制"
    录制工具可以正常使用，但 CloakBrowser 0.5.10 使用的无密钥公开 Chromium 146
    二进制文件会为保持隐蔽性而有意禁用 Playwright 的页面到主机绑定。因此，
    `browser_stop_recording` 可能返回不完整的代码：导航会被记录，但已成功执行的
    文本输入和点击会被省略。重复使用生成的录制代码前，请先进行检查。

    显式启用兼容性的进展记录在 [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532)。
    有关底层绑定决策的讨论见
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) 和
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176)。

### 动态 WebMCP 工具

Chromium 从版本 154 开始支持 WebMCP。较旧的 CloakBrowser 构建会忽略该 feature flag；如需 WebMCP，请使用兼容的浏览器构建或设置 `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`。

使用 `--enable-features=WebMCP` 启动 Chromium 后，页面可以声明 `webmcp_*` 工具。桥接器会转发 `notifications/tools/list_changed`、清空完整的 `tools/list` 缓存，客户端应重新获取列表。在 Streamable HTTP 中，只有对应会话已打开的通知流会收到事件；即使没有流，下一次 `tools/list` 仍会返回最新列表。名称、描述、schema、annotations 和 output 都是不受信任的页面数据。桥接器不会自动启用 WebMCP；`PLAYWRIGHT_MCP_WEBMCP=false` 可禁用收集。

## 本地工具

### `cloakbrowser_binary_info`

返回 CloakBrowser 包、当前平台、缓存目录、预期二进制路径、安装状态以及桥接层使用的 resolved executable path 的结构化信息。

### `cloakbrowser_bridge_info`

返回结构化桥接元数据：

加法对象 `structuredContent.cdp` 报告调用会话的托管 CDP
状态：

```json
{ "enabled": false }
```

```json
{
  "enabled": true,
  "state": "ready",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": "http://127.0.0.1:9222/cdp/<capability>",
  "activeConnections": 0
}
```

```json
{
  "enabled": true,
  "state": "unavailable",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": null,
  "activeConnections": 0
}
```

在更换浏览器后，`generation` 增加，`discoveryUrl` 旋转。
`activeConnections` 计算已接受的代理 WebSocket 连接而不暴露
客户端身份、目标ID或协议内容。对每一个非空发现 URL
作为凭证。

使用支持 CDP 的客户端使用发现 URL：

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

受管理的 CDP 不是 Playwright 服务器协议。Playwright
`chromium.connect()` 和当前的 Open WebUI `PLAYWRIGHT_WS_URL` 集成预期
一个 Playwright 服务器端点，与这个 URL 不兼容。

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
