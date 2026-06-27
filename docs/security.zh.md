---
description: 关于 CloakBrowser MCP、Docker 隔离、构建产物、密钥及网络暴露的安全模型和浏览器自动化风险指南。
icon: material/shield-lock
tags:
  - Security
  - User Guide
---

# 安全

该项目是一个浏览器自动化桥接工具。请将其视为可信代码执行基础设施。

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

如果您需要实现隔离并确保浏览器依赖项的可重现性，建议使用 Docker。仅挂载您需要的构建产物目录，并使用 `--init`，以确保浏览器子进程能被正确清理。

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
