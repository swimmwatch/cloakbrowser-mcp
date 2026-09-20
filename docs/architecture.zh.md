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

## 已管理的 CDP 所有权 { #managed-cdp-ownership }

托管 CDP 是同一浏览器版本的可选第二控制面板：

```text
MCP client -> outer bridge -> upstream Playwright MCP child -> Chromium
                    |                    |                    |-- Playwright pipe
                    |                    `-- generated config `-- internal loopback CDP
                    `-- external capability proxy <--------- CDP client
```

MCP 会话拥有外部端口租赁、能力代理、生成的上游
配置、可替换的上游子代以及当前 Chromium 生成。一个 CDP
客户端从不直接连接到内部回环端点。Bootstrap 放置一个
通过 MCP 的一次性浏览器页面挑战，并在之前通过 CDP 消耗它
外部功能已发布。Playwright 的内部远程调试管道仍然存在
与桥接管理的 TCP 端点一起处于活动状态。

MCP 会话的外部端口租用是稳定的，而子进程，
内部端点、生成编号和功能 URL 是可替换的。浏览器
损失使当前能力无效并关闭其代理套接字，但不
在后台启动一个子进程。第一次 later `browser_*` MCP 调用适用
在前进前重启规则：

1. 并发浏览器调用共享一个有限的重启；
2. 旧的子节点变得不可访问并被处理；
3. 替代子使用相同的会话配置和新的内部端口；
4. 在发布之前，会验证所有权和外部准备情况；
5. 等待的浏览器调用将被精确地转发一次到准备好的替代者。

如果准备失败，没有等待的浏览器调用能到达上游子节点，也没有能力
已发布，稍后的浏览器调用可能会启动一个新的有界尝试。浏览器状态
例如选项卡和内存存储在更换后不会恢复。本地工具，
工具列表、发现读取以及普通的 CDP 断开不会触发重启。

清理操作会逆转可达性：停止许可、使能力失效、关闭代理
套接字，处理上游子和浏览器，关闭外部监听器，然后
释放端口租赁。这可以防止旧的 URL 无声地迁移到新的浏览器。

MCP 和 CDP 命令可以同时运行。网桥不会添加跨协议
事务或推断哪个调用者拥有某个页面；调用者必须协调破坏性的或
冲突操作。

## Docker

该 Docker 镜像以固定的官方 Playwright MCP 镜像作为基础镜像。 该桥接镜像安装在 `/opt/cloakbrowser-mcp` 下，而上游的 Playwright MCP 仍可在 `/app/cli.js`上仍可访问。

## 配置

该桥接器会写入一个包含 CloakBrowser 启动选项的临时 JSON 配置文件。上游的 `PLAYWRIGHT_MCP_*` 环境变量仍会转发给上游的 Playwright MCP。

## 运输

默认传输方式为 stdio。 可通过 `--transport streamable-http` 或 `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http` 显式启用可流式传输的 HTTP。

对于 stdio，一个外层服务器拥有一个上游 Playwright MCP 子进程，并保持上游 Playwright MCP 的默认配置文件行为。 对于 Streamable HTTP，每个 MCP 会话都拥有自己的外层服务器、上游子进程、生成的配置以及内存中的传输状态。HTTP 会话会以隔离的浏览器配置文件启动上游 Playwright MCP，因此并发用户不会共享或争夺同一个持久性 Chromium 配置文件。

会话后端仅存储元数据。 内置后端为 `memory`；未来的 Redis、Postgres 或 SQLite 适配器可以协调元数据和锁，但无法在所属服务器进程退出后恢复正在运行的上游浏览器进程。 水平扩展应使用以 `mcp-session-id` 为键的粘性会话。

该网关使用 MCP SDK `StreamableHTTPServerTransport` 来支持 Streamable HTTP。它不暴露已弃用的 MCP `SSEServerTransport` 端点，也不提供旧版 `/sse` 端点。
