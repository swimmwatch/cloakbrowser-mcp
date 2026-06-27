---
title: 人性化输入行为
description: 为交互敏感的QA和可流式传输的HTTP会话启用CloakBrowser类人鼠标、键盘和滚动行为。
icon: material/gesture-tap
tags:
  - Configuration
  - Humanize
  - User Guide
---

# 人性化的输入行为

人性化的输入行为会通过CloakBrowser的
类人鼠标、键盘和滚动层来处理页面交互。当质量保证（QA）需要比
标准自动化工具提供的更真实的操作节奏、指针移动、输入节奏和滚动行为时，
该功能便派上了用场。

该桥接器不会添加新的浏览器工具，也不会更改上游 Playwright MCP
的架构。它在 Playwright MCP
页面初始化期间应用 CloakBrowser 的页面交互补丁，因此现有工具在使用相同输入时仍可正常工作。

## 有哪些变化

当 `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` 时，CloakBrowser 可以使常见的页面
操作更具人性化，包括：

- 鼠标移动和点击；
- 键盘输入和按键操作；
- 表单填写和字段切换；
- 滚动以及滚动至特定元素的行为。

这会影响交互时机和移动模式。但不会改变页面
内容、网络路由、代理设置或浏览器的地理位置。

## 全局设置

当每个 stdio 会话或默认的可流式 HTTP
会话都需要采用人性化行为时，请使用该环境变量：

```bash
CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
npx -y cloakbrowser-mcp@latest
```

该设置也可通过显式的 CLI 参数实现：

```bash
npx -y cloakbrowser-mcp@latest --humanize --human-preset careful
```

## Docker 配置

将相同的环境变量传递给容器：

```bash
docker run --rm --init -i \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

对于 Docker 中的 Streamable HTTP，该环境变量将成为
新 HTTP 会话的默认值：

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## 按会话设置可流式传输的 HTTP

可流式传输的 HTTP 客户端可以在 MCP 会话
初始化时选择人性化行为。这使得同一台服务器无需重启，
即可对比标准交互行为与人性化交互行为。

在 `initialize` 请求中发送桥接元数据：

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`humanize` 会覆盖该 HTTP 会话的进程级设置。 使用
`true` 启用人性化行为，或使用 `false` 禁用该行为，即使
服务器是使用 `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` 启动的。

`humanPreset` 接受 `default` 或 `careful`，并为该会话选择 CloakBrowser 的人类
行为预设。 它本身不会启用人性化行为； 请设置 `humanize: true` 或启用 `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`。
与 `default` 相比，`careful` 预设的运行速度较慢，且更为谨慎。

现有的 HTTP 会话是不可变的。请创建另一个 Streamable HTTP 会话，以
在标准行为和人性化行为之间切换。

## 用例

<div class="grid cards" markdown>

- :material-form-textbox: **表单 QA**

  以更真实的键盘节奏测试输入、填写、焦点变化和验证流程。

- :material-cart-check: **结账流程**

  测试交互密集的购买路径，其中输入、点击和字段切换时机会影响客户端验证。

- :material-shield-search: **交互敏感 UI 检查**

  当页面对过快或完全线性的输入反应不同时，比较标准自动化和人性化交互。

- :material-mouse-scroll-wheel: **滚动密集页面**

  通过更平滑的滚动行为验证长页面、信息流、商品列表和 lazy-loading 内容。

- :material-presentation-play: **演示和录制**

  在产品演示、walkthrough 或录制 QA 证据时生成看起来不那么机械的浏览器会话。

</div>

## 优先级与限制

| 范围 | 行为 |
| --- | --- |
| Stdio | 仅使用进程级环境变量和 CLI 标志。 |
| Streamable HTTP 默认值 | 未提供 runtime 元数据时，使用进程级环境变量和 CLI 标志。 |
| Streamable HTTP 元数据 | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"].humanize` 可为单个会话覆盖人性化行为。`humanPreset` 可选择 `default` 或 `careful`。 |
| 现有会话 | 保留 `initialize` 期间捕获的 humanize 设置。 |
| 浏览器引擎 | 仅在 `PLAYWRIGHT_MCP_BROWSER_ENGINE=cloak` 时适用。 |
| 工具 schema | Upstream Playwright MCP 浏览器工具 schema 保持不变。 |
| 自定义配置 | 目前有意不接受 `humanConfig`；结构化配置需要明确的验证 schema。 |

此功能旨在用于合法的质量保证、交互真实性及一致性
测试。不应将其视为绕过访问控制或策略
检查的手段。

## 相关配置

- [配置](configuration.md) 列出了所有桥接和上游环境变量。
- [GeoIP 代理匹配](geoip-proxy-matching.md) 解释了区域一致的代理配置文件。
- [工具](tools.md) 解释了为何上游的 Playwright MCP 浏览器工具会被原样转发。
