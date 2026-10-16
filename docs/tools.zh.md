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

Playwright MCP `@playwright/mcp@0.0.83` 的稳定参考是固定到该包提交的能力测试：[默认工具和按能力启用的工具](https://github.com/microsoft/playwright-mcp/blob/f183dad4a52965583e3cc1d59b88cdc279e2e57d/tests/capabilities.spec.ts#L19-L74)。当前工具集合由已安装的依赖定义。

本项目将 upstream Playwright MCP 视为权威来源，不维护复制的 schema 参考。

默认集合包含 25 个 upstream 工具，包括 `browser_emulate_media`。`PLAYWRIGHT_MCP_CAPS=devtools` 会将
`devtools` 能力传递给子进程，无需桥接的 `--caps` 选项；产生的 upstream 工具
和模式将不作更改地转发，其中包括 `browser_start_recording` 和
`browser_stop_recording`。

!!! warning "使用公开 CloakBrowser v146 二进制文件时的录制限制"
    录制工具可用，但无密钥的公开 Chromium 146 二进制文件会为保持隐蔽性而有意禁用 Playwright 的页面到主机绑定。因此，`browser_stop_recording` 可能返回不完整的代码：导航会被记录，但成功的输入和点击会被省略。重复使用生成的录制代码前，请先检查。

    显式启用兼容性的进展记录在 [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532)。
    有关底层绑定决策的讨论见
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) 和
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176)。

### 动态 WebMCP 工具

WebMCP 支持取决于所选浏览器构建及启用的功能。已安装的 Playwright MCP 需要带有 `getTools()` 方法的 `document.modelContext` 或 `navigator.modelContext`。需要 WebMCP 时，请使用兼容的 CloakBrowser 构建或 `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`。

[Chrome 的 WebMCP 文档](https://developer.chrome.com/docs/ai/webmcp)介绍了从 Chrome 149 开始的 origin trial、本地测试标志及无头模式限制。仅凭 Chromium 版本号不能保证与 Playwright MCP 所需 API 兼容。

使用 `--enable-features=WebMCP` 启动 Chromium 后，Playwright MCP 可以在页面打开期间添加页面提供的 `webmcp_*` 工具。这些工具是动态的：桥接器声明支持 `tools.listChanged`，收到上游的 `notifications/tools/list_changed` 后，使完整的分页工具缓存失效，并将通知转发给所属的 MCP 客户端。客户端应监听该通知，并重新调用 `tools/list`。Streamable HTTP 客户端只有在该会话的通知流处于打开状态时才能收到通知；即使通知流未打开，下一次 `tools/list` 仍会返回最新列表。

动态工具仅属于发现它们的 MCP 会话及当前托管 CDP 浏览器实例的代次。工具名称、描述、模式、注解和输出都是不可信的页面内容，桥接器会原样转发。调用前应先检查这些内容。设置 `PLAYWRIGHT_MCP_WEBMCP=false` 可禁用工具收集。桥接器不会自动启用 Chromium WebMCP。

## 本地工具

### `cloakbrowser_binary_info`

返回 CloakBrowser 包、当前平台、缓存目录、预期二进制路径、安装状态以及桥接层使用的 resolved executable path 的结构化信息。

### `cloakbrowser_bridge_info`

返回结构化桥接元数据：

- MCP 服务器名称和版本；
- 运行模式；
- 上游 Playwright MCP 包和版本；
- 上游工具数量；
- 本地 Cloak 专用工具名称。

新增的 `structuredContent.cdp` 对象报告调用会话的托管 CDP 状态：

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

浏览器替换后，`generation` 会递增，`discoveryUrl` 会更换。
`activeConnections` 统计已接受的代理 WebSocket 连接，不会暴露客户端身份、目标 ID 或协议内容。请将每个非空的发现 URL 视为访问凭证。

使用发现 URL 连接支持 CDP 的客户端：

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

托管 CDP 不是 Playwright Server 协议。Playwright 的 `chromium.connect()` 和当前 Open WebUI 的 `PLAYWRIGHT_WS_URL` 集成都要求 Playwright Server 端点，因此与此 URL 不兼容。

使用固定版本的 Playwright 客户端时，已验证对 `connectOverCDP()` 返回的浏览器调用 `browser.close()` 只会断开该客户端，Chromium 和当前代浏览器实例仍保持就绪。这是针对该客户端的观察结果，不保证其他 CDP 库具有相同行为。直接发送 CDP `Browser.close` 具有破坏性：它会终止当前代的共享 Chromium 实例，使访问凭证失效，并影响 MCP 调用方。请协调 MCP 和 CDP 操作，因为桥接器不会将相互冲突的导航、页面关闭、输入或存储修改操作串行化。

本地工具仍仅限于这两个诊断工具。`SessionSeats` 和 `getSessionSeats` 不作为 MCP 工具公开，因为受支持的 CloakBrowser 公共入口不导出该 API。

## 兼容性

CI 会构建 Docker 镜像并运行 `npm run bridge:compare`。该脚本并行启动官方 Playwright MCP 镜像和 CloakBrowser 桥接镜像，比较 upstream 工具列表，并在同一个 fixture 页面上执行默认 upstream 浏览器工具。

使用 `--report` 写入机器可读的 JSON 报告：

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI 会将该报告作为 Docker 构建和发布构建的 artifact 上传。
