---
description: CloakBrowser MCP 的桥接架构。
icon: material/graph
tags:
  - Project Internals
---

# 建筑

## 运行时

`cloakbrowser-mcp` 是一个外部 MCP 服务器，可提供 stdio 或 Streamable HTTP 接口。启动时，它会：

1. 解析或安装 CloakBrowser Chromium 二进制文件；
2. 写入一个临时 Playwright MCP 配置文件；
3. 通过 stdio 以子进程方式启动上游 `@playwright/mcp`；
4. 使用 MCP SDK 客户端传输协议连接到该子进程；
5. 通过选定的传输协议，向用户的 MCP 客户端暴露一个外部 MCP 服务器；
6. 原样转发上游工具列表和工具调用；
7. 追加 `cloakbrowser_binary_info` 和 `cloakbrowser_bridge_info`。

## 为什么采用这种设计

上游的 Playwright MCP 项目已经拥有浏览器工具合约，并且发展迅速。桥接模型使本项目保持精简，并避免了复制浏览器自动化逻辑。

## 托管 CDP 的资源归属 { #managed-cdp-ownership }

托管 CDP 是可选的第二种控制接口，用于控制 MCP 所操作的同一代浏览器实例：

```text
MCP client -> outer bridge -> upstream Playwright MCP child -> Chromium
                    |                    |                    |-- Playwright pipe
                    |                    `-- generated config `-- internal loopback CDP
                    `-- external capability proxy <--------- CDP client
```

MCP 会话负责管理外部端口租约、基于访问凭证的代理、生成的上游配置、可替换的上游子进程，以及当前代的 Chromium 实例。CDP 客户端不会直接连接内部回环端点。初始化过程通过 MCP 在浏览器页面中设置一次性验证挑战，再通过 CDP 完成验证，之后才对外发布访问凭证。Playwright 的内部远程调试管道与桥接器管理的 TCP 端点保持同时启用。

外部端口租约在整个 MCP 会话期间保持不变；子进程、内部端点、代次编号和访问凭证 URL 则可以替换。浏览器丢失后，当前访问凭证立即失效，相关代理套接字被关闭，但桥接器不会在后台启动子进程。此后的第一个 `browser_*` MCP 调用会触发“先重启，再转发”的规则：

1. 并发的浏览器调用共享一次有明确限制的重启尝试；
2. 旧子进程变为不可访问，其资源被释放；
3. 替代子进程使用相同的会话配置和新的内部端口；
4. 确认浏览器归属并验证外部访问已就绪后，才发布访问凭证；
5. 每个等待中的浏览器调用都只转发一次，目标是已就绪的替代子进程。

如果就绪验证失败，等待中的浏览器调用不会被发送给任何上游子进程，也不会发布访问凭证。之后的浏览器调用可以发起新的一次受限重启尝试。替换浏览器后，不会恢复标签页和内存存储等浏览器状态。本地工具、工具列表查询、发现信息读取，以及普通的 CDP 客户端断开连接，都不会触发重启。

清理时按顺序撤销访问能力：停止接纳新请求，使访问凭证失效，关闭代理套接字，释放上游子进程和浏览器资源，关闭外部监听器，最后释放端口租约。这样可以防止旧 URL 在没有明确通知的情况下指向新的浏览器。

MCP 和 CDP 命令可以并发执行。桥接器不会提供跨协议事务，也不会推断页面属于哪个调用方。调用方必须自行协调具有破坏性或相互冲突的操作。

## Docker

Docker 镜像以固定版本的官方 Playwright MCP 镜像为基础。桥接器安装在 `/opt/cloakbrowser-mcp`，上游 Playwright MCP 仍可通过 `/app/cli.js` 使用。

## 配置

桥接器将包含 CloakBrowser 启动选项的配置写入临时 JSON 文件。上游的 `PLAYWRIGHT_MCP_*` 环境变量仍会转发给上游 Playwright MCP。

## 传输

默认传输方式为 stdio。通过 `--transport streamable-http` 或 `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http` 显式启用 Streamable HTTP。

使用 stdio 时，一个外层服务器管理一个上游 Playwright MCP 子进程，并保留上游 Playwright MCP 的默认配置文件行为。使用 Streamable HTTP 时，每个 MCP 会话都管理独立的外层服务器、上游子进程、生成的配置，以及内存中的传输状态。HTTP 会话默认使用隔离的浏览器配置文件；显式配置持久化配置文件目录时会对其加锁，并发会话必须使用不同的目录。

会话后端只存储元数据。内置后端为 `memory`。未来的 Redis、Postgres 或 SQLite 适配器可以协调元数据和锁，但无法在所属服务器进程退出后恢复仍在运行的上游浏览器进程。水平扩展应使用以 `mcp-session-id` 为键的粘性会话。

桥接器使用 MCP SDK 的 `StreamableHTTPServerTransport` 实现 Streamable HTTP。它不提供已弃用的 MCP `SSEServerTransport`，也不提供旧版 `/sse` 端点。
