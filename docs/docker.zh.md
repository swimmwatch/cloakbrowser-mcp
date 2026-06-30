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
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

 artefacts 会被写入容器中的 `/data`。挂载该路径以保存截图、快照、下载文件和网络输出。

`--init` 之所以被推荐，是因为浏览器自动化可能会创建短暂存在的子进程。Docker 的 init 进程会干净利落地回收这些子进程。

相同的发布标签已发布到 Docker Hub，标签为 `swimmwatch/cloakbrowser-mcp`，并在 GHCR 上发布为 `ghcr.io/swimmwatch/cloakbrowser-mcp`。

## 持久化配置文件

Docker 默认不会启用持久化浏览器配置文件。当你希望 cookie、本地存储、缓存或扩展状态在
容器重启后保留时，请使用现有的 `/data` 卷作为持久化根目录：

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker 内部的环境变量必须使用容器路径，例如 `/data/profiles/default`，
而不是主机路径。桥接器会在配置文件目录缺失时创建它，验证其可写，将容器路径写入
生成的 Playwright MCP 配置，并拒绝同一服务器进程内重复的活动配置文件目录。

## Chrome 扩展

Chrome 扩展需要持久化配置文件，并且必须单独挂载。请在环境变量中使用容器路径，
而不是主机路径。扩展挂载可以是只读的：

```bash
docker run --rm --init -i \
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
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

若要从容器直接访问 HTTPS，请挂载您的证书文件并选择 HTTPS：

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

主机端的 `127.0.0.1:3000` 绑定会将端点保留在本地。 若在非回环接口上发布 Streamable HTTP，请使用 HTTPS 并启用身份验证，或将服务器部署在具有身份验证和网络控制功能的可信 TLS 终止反向代理之后。
Streamable HTTP 公开了固定的 `GET /healthz` 和 `GET /readyz` 探测点，它们位于同一主机和端口上。 如果配置了 `--http-auth-token` 或 `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` 已配置，则这些探针需要与 MCP 请求相同的 `Authorization: Bearer ...` 标头。
有关所有 HTTP 传输标志和环境变量的详细信息，请参阅生成的 [CLI 参考](generated/cli.md)。

## GeoIP 代理匹配

Docker 使用与 npm 相同的代理和 GeoIP 环境变量。当区域 QA 需要 CloakBrowser 的时区、语言和
区域设置指纹以遵循配置的代理位置时，请启用
GeoIP 代理匹配：

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

对于需要身份验证的代理，请将凭据嵌入代理 URL 中，并对用户名或密码中的特殊字符进行百分比编码。

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
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` |
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
        "--init",
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
