---
description: 运行 CloakBrowser MCP Docker 镜像，通过持久化 /data 配置文件、扩展挂载和 CloakBrowser 实现可重复的 Playwright MCP 浏览器自动化。
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

所发布的图片展示了可重复使用 MCP 的推荐运行时。

## 运行

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

 artefacts 会被写入容器中的 `/data`。挂载该路径以保存截图、快照、下载文件和网络输出。

镜像已将 Tini 作为 PID 1 和子进程收割器运行，因此常规命令不需要额外的 Docker init 进程。

## 有头会话、健康检查和受限运行时

使用 headless: false 时，容器会按需启动私有 Xvfb，并一直保留到容器退出。这不是可见桌面，也不提供 VNC、noVNC、RDP、host X11 或屏幕捕获服务。Playwright 的上下文、页面、配置文件和工件相互隔离，但原生 X11 的 focus、clipboard 和屏幕捕获不是租户隔离边界。Docker 健康检查通过私有 Unix socket 检查 MCP CLI event loop；若已启动 Xvfb，还会检查其可用性。它不会通过 MCP stdio 发送流量，也不能替代 /healthz 或 /readyz。对于 read-only root filesystem，请挂载 /data，并在可能使用有头会话时为 /tmp 和 /tmp/.X11-unix 提供 writable tmpfs。

相同的发布标签已发布到 Docker Hub，标签为 `swimmwatch/cloakbrowser-mcp`，并在 GHCR 上发布为 `ghcr.io/swimmwatch/cloakbrowser-mcp`。

## 持久化配置文件

Docker 默认不会启用持久化浏览器配置文件。当你希望 cookie、本地存储、缓存或扩展状态在
容器重启后保留时，请使用现有的 `/data` 卷作为持久化根目录：

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker 内部的环境变量必须使用容器路径，例如 `/data/profiles/default`，
而不是主机路径。桥接器会在配置文件目录缺失时创建它，验证其可写，将容器路径写入
生成的 Playwright MCP 配置，并拒绝同一服务器进程内重复的活动配置文件目录。

## CloakBrowser 许可证缓存

该镜像会将 CloakBrowser 二进制文件、许可证状态和验证缓存存储在
`/home/node/.cloakbrowser` 中。请在此处挂载命名卷，以便在更换容器时保留
GitHub 免费层或 Pro 登录状态：

```bash
docker volume create cloakbrowser-cache

docker run --rm -it \
  --entrypoint node \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  swimmwatch/cloakbrowser-mcp:latest \
  /opt/cloakbrowser-mcp/node_modules/cloakbrowser/dist/cli.js login

docker run --rm -i \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

使用同一个卷运行上游 `info` 或 `logout` 命令，即可检查或删除已保存的登录状态。
也可以通过容器的机密管理注入 `CLOAKBROWSER_LICENSE_KEY`。请勿将许可证密钥写入
镜像层、提交到版本控制的 Compose 文件，或作为构建证据捕获的命令输出中。

## Chrome 扩展

Chrome 扩展需要持久化配置文件，并且必须单独挂载。请在环境变量中使用容器路径，
而不是主机路径。扩展挂载可以是只读的：

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

当路径包含逗号或传入多个扩展目录时，请为
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` 使用 JSON 数组。更改扩展文件或扩展
路径后，请重启容器。

## 可流式传输的 HTTP

若要在本地使用 Streamable HTTP，请将容器端口发布到回环地址：

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

若要从容器直接访问 HTTPS，请挂载您的证书文件并选择 HTTPS：

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

主机端的 `127.0.0.1:3000` 绑定会将端点保留在本地。 若在非回环接口上发布 Streamable HTTP，请使用 HTTPS 并启用身份验证，或将服务器部署在具有身份验证和网络控制功能的可信 TLS 终止反向代理之后。
Streamable HTTP 公开了固定的 `GET /healthz` 和 `GET /readyz` 探测点，它们位于同一主机和端口上。 如果配置了 `--http-auth-token` 或 `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` 已配置，则这些探针需要与 MCP 请求相同的 `Authorization: Bearer ...` 标头。
有关所有 HTTP 传输标志和环境变量的详细信息，请参阅生成的 [CLI 参考](generated/cli.md)。

## 已管理 CDP { #managed-cdp }

发布已配置的 managed-CDP 范围一对一。此 stdio 示例启用一个
会话并保持每个主机端口绑定到回环地址：

```bash
docker run --rm -i \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --cdp-enabled \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

`--cdp-host 0.0.0.0` 是 Docker 端口转发所必需的，因此明确
`--cdp-allow-remote` 选择加入和具体的 `--cdp-advertised-host` 也是必需的。
不要将范围重新映射到不同的主机端口号：发现 URL 包含
租用的端口和每个已发布的端口必须一对一地路由到其所属会话。

对于多会话 Streamable HTTP，请配置并发布池，但不要设置
如果客户应单独选择，则处理默认值：

```bash
docker run --rm \
  -p 127.0.0.1:3000:3000 \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http \
  --http-host 0.0.0.0 \
  --http-port 3000 \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

一个经过身份验证的 `initialize` 请求使用 `cdpEnabled: true` 租约发布了一个
端口。省略的值继承进程默认值，而`cdpEnabled: false`
明确选择退出且不使用任何 CDP 端口。池耗尽仅拒绝新的
启用 CDP 的会话；它不会降低禁用会话的容量。

从 `cloakbrowser_bridge_info` 读取具有能力的 URL。不要放入其中
容器日志或健康检查。连接到像 CDP API 这样的
`chromium.connectOverCDP()`；URL 与 Playwright 不兼容
`chromium.connect()` 或当前的 Open WebUI 流程。

`--cdp-advertised-scheme https` 将已发布的 URL 更改为 `https`/`wss`，但该
桥不为托管的 CDP 提供 TLS。请使用运营商拥有的 TLS 终端。
占用外部网络命名空间中相同的广告端口，保留
`Host`/`Origin`，并一对一转发到明文桥接监听器。该
bridge-to-Chromium 跳转也保持明文回环流量。

## GeoIP 代理匹配

Docker 使用与 npm 相同的代理和 GeoIP 环境变量。当区域 QA 需要 CloakBrowser 的时区、语言和
区域设置指纹以遵循配置的代理位置时，请启用
GeoIP 代理匹配：

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

对于需要身份验证的代理，请将凭据嵌入代理 URL 中，并对用户名或密码中的特殊字符进行百分比编码。

受支持的 CloakBrowser 二进制文件使用原生 URL 内联代理身份验证；较旧的二进制
文件会回退到 Playwright 代理对象。

当容器运行 Streamable HTTP 时，客户端还可以通过 `initialize` 元数据，为每个 MCP 会话选择不同的
代理。请参阅
[GeoIP 代理匹配](geoip-proxy-matching.md)，了解运行时代理元数据、
多区域用例及限制。

## 默认值

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` |

## MCP 客户端配置

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## 本地构建

```bash
npm run docker:build
npm run docker:smoke
```

该 Dockerfile 使用已锁定的官方 Playwright MCP 镜像作为运行时基础镜像，在构建过程中应用可用的 Debian 安全更新，从运行时镜像中移除未使用的全局 npm 有效载荷，并在 `/opt/cloakbrowser-mcp`下安装桥接服务。

该发布工作流会发布 SBOM 和溯源证明，包含源代码、修订版、版本、许可证、基础镜像名称以及基础镜像摘要的 OCI 标签，并在发布前使用 Trivy 对构建好的镜像进行扫描。

## 更多实用路径

要在 upstream Playwright MCP 和本包之间选择，请查看[对比](comparison.md)。快速任务请使用[操作示例](recipes/index.md)：持久配置文件、扩展、reverse proxy、区域 QA、Claude Desktop、Codex CLI 和 CI 冒烟测试。
