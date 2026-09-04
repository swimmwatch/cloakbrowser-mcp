---
title: GeoIP 代理匹配
description: 将CloakBrowser的时区、语言和区域设置指纹与配置的代理位置进行匹配，以实现区域质量保证（QA）和可流式传输的HTTP会话。
icon: material/map-marker-radius
tags:
  - Configuration
  - GeoIP
  - Proxy
  - User Guide
---

# GeoIP 代理匹配

GeoIP 代理匹配功能可确保浏览器指纹设置与上游 Playwright MCP
所使用的代理位置保持一致。当区域质量保证（QA）工作需要
依赖一致的代理、时区、语言和区域设置配置文件时，此功能非常有用。

该桥接器本身不会创建或路由代理流量。它会将 `PLAYWRIGHT_MCP_PROXY_SERVER`
传递给 CloakBrowser 的启动准备流程。启用匹配后，CloakBrowser 会解析已配置代理的
出口位置，并为时区、浏览器语言、指纹区域设置和 WebRTC IP 添加相应的启动标志。

## 有哪些变化

当 `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` 时，网关可以为 CloakBrowser 添加以下
启动参数：

- `--fingerprint-timezone`
- `--lang`
- `--fingerprint-locale`
- `--fingerprint-webrtc-ip`

这有助于使浏览器配置文件在内部与代理区域保持一致。
上游的 Playwright MCP 工具模式和浏览器工具仍会
原样转发。

## 全局设置

对于 stdio 客户端，以及作为
可流式传输的 HTTP 会话的默认设置，请使用进程级环境变量：

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

当某些主机需要绕过代理时，请添加绕过列表：

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
PLAYWRIGHT_MCP_PROXY_BYPASS=".internal,localhost" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

通过在
`PLAYWRIGHT_MCP_PROXY_SERVER` 中嵌入凭据，支持经过身份验证的 HTTP 代理。 请对凭据中的特殊字符进行百分比编码，
例如，对于 `p@ssword`，请使用 `p%40ssword` 表示 `p@ssword`。

受支持的 CloakBrowser 二进制文件使用原生 URL 内联身份验证，即使代理要求严格的
身份验证 CONNECT 请求，也会报告代理的真实出口 IP。较旧的二进制文件会保留
Playwright 代理对象作为兼容性回退。

## Docker 配置

将相同的变量传递给容器。尽可能将代理凭据保存在您的密钥
管理器或 MCP 客户端环境中。

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

对于 Docker 中的 Streamable HTTP，请照常发布 HTTP 端口，并将代理
变量保留为容器环境的默认值：

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## 按会话计费的可流式传输 HTTP 代理

支持流式传输的 HTTP 客户端可以在 MCP 会话初始化时选择代理。
这使得一个长期运行的 MCP 服务器能够处理不同的区域场景，而无需
重启。

在 `initialize` 请求中发送桥接元数据：

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true
      }
    }
  }
}
```

`proxyServer` 在该 HTTP 会话中覆盖了 `PLAYWRIGHT_MCP_PROXY_SERVER`。
`proxyBypass` 仅在存在 `proxyServer` 时，才会覆盖 `PLAYWRIGHT_MCP_PROXY_BYPASS`，但仅当 `proxyServer` 存在时
才成立。如果 `proxyServer` 存在，而 `proxyBypass` 被省略，则该会话的继承
代理绕过配置将被清除。

`geoipProxyMatch` 将覆盖该 HTTP
会话的进程级 GeoIP 设置。请使用 `true` 可启用该会话的匹配功能，或使用 `false` 禁用该功能，
即使服务器启动时已启用匹配功能也是如此。

现有的 HTTP 会话是不可变的。请创建另一个 Streamable HTTP 会话，以
切换到其他代理或位置。

如果 `proxyServer` 包含凭据，请将其以 URL 编码形式保存，并通过
密钥或客户端运行时配置传递该值，而不是将其写入
项目文件中。

## 用例

<div class="grid cards" markdown>

- :material-cart-check: **本地化电商 QA**

  测试结账、税费、配送提示、货币和区域目录规则，并让浏览器时区与区域设置
  和代理位置保持一致。

- :material-web: **区域落地页**

  验证依赖访客区域的语言、同意提示、活动和内容变体。

- :material-lifebuoy: **客户支持复现**

  在不为每个代理位置重启整个 MCP 服务器的情况下，复现来自客户区域的问题报告。

- :material-clock-check: **时区敏感流程**

  验证日期选择器、预订窗口、提醒和排期页面，确保时区与区域设置
  与网络区域匹配。

- :material-source-branch-sync: **并行区域会话**

  使用不同代理运行独立的 Streamable HTTP 会话，让代理可以在一个服务器进程中
  比较多个区域。

</div>

## 优先级与限制

| 范围 | 行为 |
| --- | --- |
| Stdio | 仅使用进程级环境变量和 CLI 标志。 |
| Streamable HTTP 默认值 | 未提供 runtime 元数据时，使用进程级环境变量和 CLI 标志。 |
| Streamable HTTP 元数据 | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"]` 可为单个会话覆盖代理和 GeoIP 匹配。 |
| 现有会话 | 保留 `initialize` 期间捕获的代理和 GeoIP 设置。 |
| 经过身份验证的 HTTP 代理 | 在受支持的二进制文件上使用 CloakBrowser 原生 URL 内联身份验证，在较旧的二进制文件上使用 Playwright 代理对象。 |
| 原始时区/区域设置标志 | `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` 中显式的 `--fingerprint-timezone`、`--lang` 和 `--fingerprint-locale` 值优先于 GeoIP 派生值，且不会重复。 |
| Browser geolocation API | 此功能不会配置它；只会对齐 CloakBrowser 的时区、语言、区域设置和 WebRTC IP 指纹值。 |

GeoIP 位置数据仅为近似值，具体取决于代理 IP 地址以及 CloakBrowser 的
GeoIP 数据库。CloakBrowser 会在首次
使用时根据需要下载并缓存该离线数据库。

例如，以下配置会保留显式的时区和区域设置，同时仍使用 GeoIP 匹配来解析代理出口 IP：

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS='["--fingerprint-timezone=America/New_York","--lang=en-US","--fingerprint-locale=en-US"]' \
npx -y cloakbrowser-mcp@latest
```

请将此功能用于正当的质量保证、本地化和环境一致性
测试。不应将其视为绕过访问控制或区域
策略检查的手段。

GeoIP 匹配采用 fail-closed 行为。如果 CloakBrowser 无法解析代理出口 IP、下载或
读取 GeoIP 数据库，或无法得出时区或区域设置，浏览器启动将失败，而不会以部分
匹配的指纹继续。GeoIP 解析限制为 20 秒；首次下载离线 GeoIP 数据库独立进行，
可能需要更长时间。

## 相关配置

- [配置](configuration.md) 列出了所有桥接和上游环境变量。
- [Docker](docker.md) 说明了容器运行时的默认设置以及 Streamable HTTP 发布。
- [工具](tools.md) 解释了为何上游的 Playwright MCP 浏览器工具会被原样转发。

## 更多实用路径

要在 upstream Playwright MCP 和本包之间选择，请查看[对比](comparison.md)。快速任务请使用[操作示例](recipes/index.md)：持久配置文件、扩展、reverse proxy、区域 QA、Claude Desktop、Codex CLI 和 CI 冒烟测试。
