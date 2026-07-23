---
description: cloakbrowser-mcp 版本与 upstream Playwright MCP 版本之间的兼容性映射。
icon: material/source-branch-sync
tags:
  - 用户指南
---

# 版本兼容性

`cloakbrowser-mcp` 对自身版本遵循 Semantic Versioning。浏览器工具契约来自 `@playwright/mcp`，因此每个版本都会记录用于构建和测试的 Playwright MCP 版本。

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp 依赖 | Playwright MCP Docker 基础镜像             | CloakBrowser 依赖 | Node.js   | 传输                   | 已测试平台                                                                                      | 工具兼容性                         |
| ---------------- | -------------------- | ------------------------------------------ | ----------------- | --------- | ---------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| `1.9.0`          | `^0.0.78`            | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.1`        | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 和 24-26；Linux x64/arm64；macOS arm64/x64；Windows x64；Docker `linux/amd64`、`linux/arm64` | Upstream 工具在 CI 中比较。 |
| `1.8.0`          | `^0.0.78`            | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`        | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 和 24-26；Linux x64/arm64；macOS arm64/x64；Windows x64；Docker `linux/amd64`、`linux/arm64` | Upstream 工具在 CI 中比较。 |
| `1.7.0`          | `^0.0.77`            | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`         | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream 工具在 CI 中比较。 |
| `1.6.1`          | `^0.0.77`            | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`         | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream 工具在 CI 中比较。 |
| `1.6.0`          | `^0.0.77`            | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`         | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream 工具在 CI 中比较。 |
| `1.5.0`          | `^0.0.76`            | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`         | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream 工具在 CI 中比较。 |
| `1.4.0`          | `^0.0.76`            | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`         | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream 工具在 CI 中比较。 |
| `1.3.0`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`         | `>=20`    | stdio, Streamable HTTP | Node.js 20-26; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.2.7`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.2.6`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.2.5`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.2.3`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.2.2`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.2.1`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.2.0`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.1.0`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.0.2`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.0.1`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |
| `1.0.0`          | `^0.0.75`            | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`         | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream 工具在 CI 中比较。 |

<!-- compatibility-table:end -->

## 如何阅读此表

- `cloakbrowser-mcp` 是本项目的 npm 和 Docker 发布版本。
- `@playwright/mcp` 是 CLI 包使用的 npm 依赖范围。
- Playwright MCP Docker 基础镜像是项目 Docker 镜像使用的 upstream 镜像。
- CloakBrowser 依赖是用于解析和安装 CloakBrowser Chromium 二进制文件的 npm 范围。
- `Node.js` 是 npm 包支持的 runtime 范围。
- 传输是该桥接层暴露的 MCP 传输方式。
- 已测试平台是 CI 和 release smoke 测试覆盖的平台。
- 工具兼容性说明默认 upstream Playwright MCP 工具表面是否与官方 runtime 比较。

当可复现性很重要时，请固定 `cloakbrowser-mcp` 的准确版本，而不是使用 `latest`。

Docker 版本目前发布 `linux/amd64` 和 `linux/arm64`。Browser parity 在 `linux/amd64` 上比较；两个 Docker 平台都会在发布 multi-platform manifest 前运行 release smoke 测试。
