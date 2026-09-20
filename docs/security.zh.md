---
description: 关于 CloakBrowser MCP、Docker 隔离、构建产物、密钥及网络暴露的安全模型和浏览器自动化风险指南。
icon: material/shield-lock
tags:
  - Security
  - User Guide
---

# 安全

该项目是一个浏览器自动化桥接工具。请将其视为可信代码执行基础设施。

## 托管 CDP 安全 { #managed-cdp-security }

受管理的 CDP 默认情况下被禁用。它提供任意的 Chromium 开发者工具控制，
不是简化版浏览器工具 API。仅在受信任的客户端上启用它。该功能在
`cloakbrowser_bridge_info.cdp.discoveryUrl` 是一种持有者凭证：不要记录它，
将其存储在票据中，或在会话之间共享。它会在更换浏览器后轮换
而一个旧的 URL 从不转移到替换代。

非回环 CDP 绑定需要同时具有 `--cdp-allow-remote` 和一个具体的广告
主机。对已发布的端口添加网络访问控制。选择
`--cdp-advertised-scheme https` 不提供 TLS。托管监听器和
Chromium 跳保持明文；一个运营商拥有的同端口 TLS 终端必须保持
所宣传的 `Host` 和 `Origin` 权限，并保持一对一路由到
拥有会话。

运行时日志从不包含功能路径、目标ID、CDP有效负载、浏览器数据，
cookies、原始 `Host` 或 `Origin` 值，或配置文件路径。被拒绝的安全检查是
仅以会话范围的 `cdp_security_rejections` 警告报告，持续 60 秒
正在为 `capability`、`host` 和 `origin` 进行饱和计数；清理会刷新任何剩余的内容
计数。成功的检查不会创建每次请求的审计记录。

### 固定限制

限制独立适用于每个启用 CDP 的 MCP 会话：

| 边界 | 限制 |
| --- | --- |
| 活动的代理 WebSocket 连接，包括进行中的握手 | 8 |
| 并发预升级 HTTP 请求 | 16 |
| 请求头 | 16 千字节 |
| 受支持路由的请求体 | 不允许 |
| 缓冲的 Chromium HTTP 响应 | 4 兆字节 |
| 传入或传出 WebSocket 消息 | 16 兆字节 |
| 按方向排队的未发送 WebSocket 数据 | 16 兆字节 |
| 请求头，上游 HTTP 响应，或 WebSocket 握手 | 10秒 |
| 在强制关闭之前优雅的代理关闭 | 5秒 |
| 本地错误响应体 | 8 千字节 |

### HTTP 错误

本地故障使用 JSON `{"error":{"code":"...","message":"..."}}` 与
`Cache-Control: no-store`、`Content-Type: application/json; charset=utf-8`，以及一个
确切的 `Content-Length`。方法失败还包括 `Allow`。稳定的映射是：

| 状态 | 代码 |
| --- | --- |
| `400` | `bad_request` |
| `403` | `forbidden` |
| `404` | `not_found` |
| `405` | `method_not_allowed` |
| `408` | `request_timeout` |
| `413` | `payload_too_large` |
| `431` | `headers_too_large` |
| `500` | `internal_error` |
| `502` | `bad_gateway` |
| `503` | `unavailable` |
| `504` | `gateway_timeout` |
| Chromium `400..499` | `upstream_error`，保持现状 |

Chromium 重定向、服务器错误、格式错误的响应和传输失败是
已规范化，而不是暴露 Chromium 响应体。由桥接生成的拒绝
在上游调度之前没有 Chromium 副作用。只读发现请求可能
在纠正条件后重试。对于状态改变不明确的失败，
重新读取 `/json/list` 并协调应用状态；不要假设 `Retry-After` 或
自动幂等性

### WebSocket 关闭

本地生成的关闭使用固定的已遮蔽对。有效的对等关闭会被转发。

| 代码 | 原因 | 使用 |
| --- | --- | --- |
| `1001` | `going_away` | 会话、生成或代理关闭 |
| `1002` | `protocol_error` | 格式错误的 WebSocket 协议输入 |
| `1009` | `message_too_big` | 消息超出配置的限制 |
| `1011` | `internal_error` | 意外的上游断开或中继故障 |
| `1013` | `try_again_later` | 超过每方向未发送队列的限制 |

## 信任边界

外部服务器支持 stdio 和 Streamable HTTP。它会将上游的 Playwright MCP 作为子进程启动，并转发工具调用。浏览器自动化、文件输出、网络访问以及不安全评估行为均由上游的 Playwright MCP 控制。

请勿通过未经身份验证的网络封装器暴露 stdio 服务器。任何能够调用工具的客户端都可以控制浏览器、读取浏览器可观察的页面数据，并请求构建产物。

对于本地客户端，Streamable HTTP 默认通过 HTTP 绑定到 `127.0.0.1`。 若将其绑定至 `0.0.0.0` 或在回环之外发布，则需使用 `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` 或等效的反向代理身份验证；若使用 `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` 配合 TLS 文件进行直接 HTTPS 连接，或在可信网络边缘终止 TLS，并仅允许可信客户端访问。

## 不安全的工具

Upstream Playwright MCP 包含诸如 `browser_evaluate` 和 `browser_run_code_unsafe` 之类的工具。 这些工具可在浏览器或 Playwright 服务器环境中执行 JavaScript。请仅将此服务器连接至您信任的 MCP 客户端。

## 配置

使用上游选项来实施访问控制和安全防护措施：

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

这些只是辅助性防护措施，不能替代流程、容器、网络和文件系统的隔离机制。

尽可能对可信目标使用白名单。将无限制的文件访问权限和机密文件视为敏感功能，并将其排除在共享的 MCP 客户端配置文件之外。

## 沙盒模式

Docker 镜像默认设置为 `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true`，因为在容器化的 CI 和 MCP 运行时中，浏览器沙箱功能通常不可用。这是为了兼容性而做出的权衡。 如果您的主机和容器运行时支持 Chromium 沙箱机制，请设置：

```bash
CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=false
```

如果不使用 Chromium 沙箱运行，请使用 Docker 或其他进程隔离机制，并避免挂载过宽的主机目录。

## 遗物与秘密

屏幕截图、快照、下载文件、网络日志、控制台日志和跟踪信息可能包含凭据或私有页面内容。请仅挂载您需要的构建产物目录，使用后将其清理干净，并避免公开共享构建产物包。

如果您的 MCP 客户端将凭据注入到浏览器会话中，请优先使用作用域限定在目标网站上的短效凭据。请勿将长效令牌包含在屏幕截图、网络响应或持久性浏览器配置文件中。

## Docker

建议使用 Docker 来实现隔离和可复现的浏览器依赖。仅挂载所需的工件目录；镜像已包含 Tini，可正确回收浏览器子进程。在加固的只读容器中，请保持挂载 `/data`；若可能存在有头会话，还应为 `/tmp` 和 `/tmp/.X11-unix` 提供可写的临时挂载。


从 Docker 发布 Streamable HTTP 时，建议使用 `-p 127.0.0.1:3000:3000`。直接发布到公共接口会使任何可访问的客户端浏览器都具备自动化操作能力，除非您添加身份验证和网络控制措施。

在持续集成（CI）过程中以及发布前，会使用 Trivy 对 Docker 镜像进行扫描。该扫描工具会检查操作系统和库中存在的高危和关键漏洞，并在启用该功能时将 SARIF 结果上传至 GitHub 代码扫描服务。

## 供应链核查

该代码库使用了 GitHub 原生且开源的免费检查功能：

- CodeQL，用于 JavaScript 和 TypeScript 的静态分析。
- Dependency Review，用于审查拉取请求中的依赖项变更。
- `npm audit --omit=dev --audit-level=high`，用于运行时 npm 依赖项。
- OpenSSF Scorecard：用于监测仓库供应链信号。
- zizmor：用于 GitHub Actions 安全代码检查。
- Trivy：用于 Docker 镜像漏洞扫描。

这些检查不能替代对浏览器自动化行为或发布变更的手动审查。

## 报告

请使用 [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md) 报告漏洞。
