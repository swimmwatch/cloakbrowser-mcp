---
description: 用于 CloakBrowser 浏览器自动化的 Playwright MCP 桥接器，支持 Docker、Streamable HTTP、持久化配置文件、经过验证的上下文选项、扩展加载、GeoIP 代理匹配和拟人化输入。
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">快速开始</a>
  <a class="md-button" href="tools/">工具</a>
  <a class="md-button" href="docker/">Docker</a>
</p>

# CloakBrowser MCP 服务器

`cloakbrowser-mcp` 是一个基于模型上下文协议（Model Context Protocol）的浏览器自动化服务器，它在上游运行 `@playwright/mcp` 并配合 CloakBrowser Chromium 二进制文件使用。 当您需要兼容 Playwright MCP 的浏览器工具、CloakBrowser 执行、npm 安装、Docker 镜像、可流式传输的 HTTP 会话、支持 GeoIP 的代理匹配（用于区域性质量保证），或针对交互敏感流程的人性化输入行为时，请使用该服务器。

当前版本：{{ project.version_tag }}。

## 版本兼容性

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.5.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.3`     | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.4.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.3.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`    | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.2.7`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.2.6`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.2.5`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.2.3`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.2.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.2.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.2.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.1.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | 在 CI 中比较 |
| `1.0.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | 在 CI 中比较 |
| `1.0.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | 在 CI 中比较 |
| `1.0.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | 在 CI 中比较 |

<!-- compatibility-table:end -->

有关本项目 SemVer 版本与上游 Playwright MCP 版本之间的维护映射关系，请参阅 [版本兼容性](version-compatibility.md)。

## 是什么

<div class="grid cards" markdown>

- :material-connection: **桥接运行时**

  将 upstream Playwright MCP 作为子进程启动，并原样转发浏览器工具调用。

- :material-incognito: **CloakBrowser 执行**

  生成 Playwright MCP 配置，并将 `launchOptions.executablePath` 指向 CloakBrowser。

- :fontawesome-brands-node-js: **npm CLI**

  作为轻量级 Node.js CLI 包发布，适用于 stdio 和 Streamable HTTP MCP 客户端。

- :fontawesome-brands-docker: **Docker 镜像**

  基于官方 Playwright MCP 镜像，并预加载 CloakBrowser 二进制缓存。

- :material-map-marker-radius: **GeoIP 代理匹配**

  将 CloakBrowser 的时区、语言和区域指纹标志与配置的代理位置对齐。

- :material-gesture-tap: **人性化输入行为**

  通过 CloakBrowser 类人的鼠标、键盘和滚动层处理页面交互。

</div>

## 工具表面

上游的 Playwright MCP 工具契约具有权威性。本项目仅添加了两个本地内省工具：

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## 后续步骤

- [入门指南](getting-started.md)，了解 npm、Docker 和 MCP 客户端的配置。
- [配置](configuration.md)，用于支持的环境变量。
- [GeoIP 代理匹配](geoip-proxy-matching.md)，用于区域质量保证、运行时代理元数据以及多位置 Streamable HTTP 会话。
- [人性化输入行为](humanized-input-behavior.md)，用于提升交互真实感、配置及用例。
- [工具](tools.md)，用于满足工具界面的预期以及与上游版本保持一致。
- [常见问题解答](faq.md)，涵盖常见的安装、Docker、功能一致性和安全问题。
- [贡献者指南](contributor-guide.md)，涵盖开发、测试、架构及发布详情。
