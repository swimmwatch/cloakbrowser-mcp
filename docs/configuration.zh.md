---
description: Playwright MCP 桥接器的运行时配置，包括 Streamable HTTP 会话、持久化配置文件、经过验证的上下文选项、扩展路径、GeoIP 代理匹配和拟人化输入。
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# 配置

使用上游 `PLAYWRIGHT_MCP_*` 变量来实现 Playwright MCP 行为。 仅将 `CLOAK_PLAYWRIGHT_MCP_*` 用于 Cloak 特有的桥接行为。

旧版 `CLOAKBROWSER_MCP_*` 变量已不被支持。
生成的 [CLI 参考](generated/cli.md) 是桥接 CLI 标志及其对应环境变量的权威列表。

## 桥接选项

| Variable | Default | Description |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Bridge transport: `stdio` or `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Streamable HTTP listener protocol: `http` or `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Streamable HTTP bind host. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Streamable HTTP bind port. Use `0` for an ephemeral port in tests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Streamable HTTP endpoint path. `/healthz` and `/readyz` are reserved for probes. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Optional Bearer token required on Streamable HTTP requests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Session metadata backend. Only `memory` is implemented in this release. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Idle TTL for Streamable HTTP sessions. Expired sessions dispose their bridge and upstream child process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Maximum active Streamable HTTP sessions in one process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | TLS certificate PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | TLS private key PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | TLS PFX/PKCS12 path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Passphrase for an encrypted HTTPS key or PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Streamable HTTP operational log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Upstream Playwright MCP proxy server. Used as the GeoIP source when matching is enabled. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Upstream proxy bypass list for hosts that should not use `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Resolves `PLAYWRIGHT_MCP_PROXY_SERVER` GeoIP and matches CloakBrowser timezone and locale fingerprint flags to that proxy location. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Enables CloakBrowser human-like mouse, keyboard, and scroll behavior. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | CloakBrowser human behavior preset: `default` or `careful`. Used only when humanize is enabled. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | 持久化 Chromium 配置文件目录。桥接器会将其解析为绝对路径，在缺失时创建它，验证其可写，并写入生成的 `browser.userDataDir`。 |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | 包含已验证上下文选项的 JSON 对象。支持的字段列在下方。 |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | 现有 Chrome 扩展目录的 JSON 数组或逗号分隔列表。需要 `PLAYWRIGHT_MCP_USER_DATA_DIR`。对于 Windows 路径或包含逗号的路径，请使用 JSON 数组。 |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## GeoIP 代理匹配

将 `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` 与 `PLAYWRIGHT_MCP_PROXY_SERVER` 配对
，从而根据
代理位置推导出 CloakBrowser 的时区、语言和区域设置指纹标志。该桥接器将代理路由任务委托给上游的 Playwright
MCP，仅注入已解析的 `--fingerprint-timezone`、`--lang` 以及
`--fingerprint-locale` 启动标志。

有关配置示例、运行时
可流式传输的 HTTP 代理元数据、用例、优先级规则和限制，请参阅 [GeoIP 代理匹配](geoip-proxy-matching.md)。

## 拟人化的输入行为

将 `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` 设置为启用 CloakBrowser 的类人
鼠标、键盘和滚动层，用于页面交互。 该桥接器通过
Playwright MCP 的页面初始化钩子应用此设置，因此上游浏览器工具
的架构保持不变。

有关配置示例、
运行时可流式传输的 HTTP 元数据、用例及限制，请参阅 [人性化输入行为](humanized-input-behavior.md)。

## 可流式传输的 HTTP 运行时元数据

支持流式传输的 HTTP 客户端可以通过在 `initialize` 请求中添加
特定于桥接器的元数据，为每个 MCP 会话选择相应的运行时选项：

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true,
        "headless": false,
        "humanize": true,
        "humanPreset": "careful",
        "userDataDir": "/absolute/path/to/profile",
        "contextOptions": {
          "viewport": { "width": 1280, "height": 720 },
          "locale": "en-US",
          "timezoneId": "America/New_York"
        },
        "extensionPaths": ["/absolute/path/to/extension"]
      }
    }
  }
}
```

`proxyServer` 在该 HTTP 会话中覆盖了 `PLAYWRIGHT_MCP_PROXY_SERVER`。
`proxyBypass` 仅在存在 `proxyServer` 时，才覆盖 `PLAYWRIGHT_MCP_PROXY_BYPASS`，但仅当 `proxyServer` 存在时
才生效。 `geoipProxyMatch` 可在无需重启 MCP 服务器的情况下，
启用或禁用该会话的 GeoIP 匹配功能。现有会话将保留其初始代理；
需创建新的 HTTP 会话才能切换位置。

`humanize` 可以为该会话启用或禁用人性化输入行为，
而不会影响其他会话。 `humanPreset` 可为该会话选择 `default` 或 `careful`
，但本身不会启用人性化行为。 现有
会话将保留在 `initialize` 期间捕获的行为。

`headless` 可为该会话启用或禁用无头浏览器模式。 将
`headless` 设置为 `false` 需要可用的显示环境，特别是在
Docker 或 Linux 服务器部署中。

`userDataDir` 为该会话启用持久化 Chromium 配置文件，并覆盖
`PLAYWRIGHT_MCP_USER_DATA_DIR`。桥接器会将目录解析为平台原生绝对路径，
在缺失时创建它，验证其可写，并写入生成的 `browser.userDataDir`。
持久化配置文件会禁用该会话默认的 Streamable HTTP 隔离配置文件。桥接器会
拒绝同一进程内重复的活动配置文件目录；跨进程配置文件冲突仍由
Chromium/Playwright 报错。

`contextOptions` 会经过验证，并在 `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS`
之上进行浅合并；嵌套对象会整体替换。支持的字段为 `userAgent`、
`viewport`、`locale`、`timezoneId`、`colorScheme`、`permissions`、
`geolocation`、`extraHTTPHeaders`、`httpCredentials`、`ignoreHTTPSErrors`、
`offline`、`deviceScaleFactor`、`isMobile` 和 `hasTouch`。本版本不支持任意
传递 `BrowserContextOptions`。

`extensionPaths` 必须指向现有目录，并且需要持久化的 `userDataDir`。
桥接器会将扩展路径解析为平台原生绝对路径，传给 CloakBrowser，并把生成的
Chromium 参数 `--load-extension` 和 `--disable-extensions-except` 写入生成的
Playwright MCP 配置。

经过身份验证的 HTTP 代理凭据可以嵌入到 `proxyServer` 中，例如
`http://user:pass@proxy.example:8080`。对具有 URL 含义的凭据
字符进行百分比编码，例如 `@`、 `:`、`/`、 `?`、 `#`，以及 `%`。

有关多地点质量保证模式，请参阅 [GeoIP 代理匹配](geoip-proxy-matching.md)。
有关交互真实性模式，请参阅 [人性化输入行为](humanized-input-behavior.md)。

## 上游选项

该桥接器将 `PLAYWRIGHT_MCP_*` 的设置转发给上游的 Playwright MCP。其中包括以下上游选项：

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`

有关完整的上游选项列表，请参阅上游 Playwright MCP 文档。

## 日志记录

可流式传输的 HTTP 模式会将易于人类阅读的启动和请求日志写入 stdout。Stdio 模式不会输出常规操作日志，因此 MCP JSON-RPC 的 stdout 保持协议纯净。命令行界面（CLI）启动时的致命错误仍会写入 stderr。

## HTTPS

Streamable HTTP 默认使用本地 HTTP。若要选择直接 TLS，请使用 `--http-protocol https` 或 `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` 选择“直接 TLS”模式，然后提供证书/密钥对或 PFX 文件：

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

对于外部或非回环暴露，请使用 HTTPS 并配合 `--http-auth-token`，或者在可信的反向代理上终止 TLS，该代理还应强制执行身份验证和网络访问控制。

## 可流式传输的 HTTP 会话

每个 Streamable HTTP MCP 会话都拥有自己的桥接运行时和上游 Playwright MCP 子进程。HTTP 会话使用隔离的浏览器配置文件运行上游 Playwright MCP，因此并发用户不会争夺同一个持久性 Chromium 配置文件。 内置的 `memory` 会话后端仅存储会话 ID、时间戳、过期时间和状态等元数据。 浏览器状态仍保留在活跃的上游子进程中，而相关资源仍由 `PLAYWRIGHT_MCP_OUTPUT_DIR` 控制。

对于水平扩展，请在负载均衡器后运行多个服务器副本，并使用以 `mcp-session-id` 头为键的粘性会话。 未来的 Redis、Postgres 或 SQLite 后端可以协调元数据和锁，但当拥有该会话的进程退出后，它们无法恢复正在运行的浏览器会话。

## 可流式传输的 HTTP 探针

当桥接器运行时，若使用 `--transport streamable-http`，它会在与 MCP 端点相同的主机和端口上暴露固定的探针端点：

- `GET /healthz` 返回进程健康状况元数据： `status`、`version`、 `transport`，以及 `uptimeMs`。
- `GET /readyz` 返回就绪状态元数据和会话容量： `sessions.active`、`sessions.pending`、 `sessions.max` 以及 `sessions.available`。

当会话容量可用时，就绪状态返回 HTTP `200`，而当 `503`，而当 `active + pending >= max` 时则返回 `active + pending >= max`。
如果配置了 `--http-auth-token` 或 `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` 已配置，则这两个探针都需要与 MCP 请求相同的 `Authorization: Bearer ...` 标头。 如果没有身份验证令牌，探针将在配置的 HTTP 绑定地址上保持开放状态。
