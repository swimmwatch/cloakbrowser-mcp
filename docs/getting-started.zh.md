---
description: 通过 npm 或 Docker 安装并运行 CloakBrowser MCP。
icon: material/rocket-launch
tags:
  - User Guide
---

# 入门指南

请使用已发布的 npm 包或 Docker 镜像。仅在开发时才需要从源代码安装。

如果您的机器上已运行 MCP 客户端且安装了 Node.js，请选择 npm。如果您希望获得一个可重复的运行时环境，其中包含上游 Playwright MCP 基础镜像以及在容器内预先配置好的 CloakBrowser 缓存，请选择 Docker。

如需快速了解常见的设置问题，请参阅[常见问题解答](faq.md)。

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

当可重复性至关重要时，请将版本固定：

```bash
npx -y {{ project.npm_pin }}
```

该 npm 包需要 Node.js 22.12 或更高版本。CloakBrowser 在首次使用时会下载其 Chromium 二进制文件，除非该文件已被缓存。

在连接客户端之前，请使用 `doctor` 来验证本地 Node.js 运行时、包元数据、上游 Playwright MCP CLI 的解析情况以及 CloakBrowser 二进制文件的元数据。 该命令不会启动桥接服务，也不会下载浏览器。

默认传输方式为 stdio。当您的 MCP 客户端连接到 HTTP 端点时，请使用 `--transport streamable-http`，而不是启动一个 stdio 进程。 HTTP 端点默认设置为 `http://127.0.0.1:3000/mcp`，其中 `GET /healthz` 和 `GET /readyz` 探测位于同一主机和端口上。请使用 `--http-protocol https` 时，应将其与 `--https-cert` 以及 `--https-key` 或 `--https-pfx`，当桥接器需直接终止 TLS 时。
请参阅生成的 [CLI 参考](generated/cli.md)，以获取完整的标志列表及对应的环境变量。

## Docker

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker 是最易于重现的运行时环境，因为该镜像基于已固定的官方 Playwright MCP 镜像，并包含一个预先配置好的 CloakBrowser 浏览器缓存。 已发布的镜像支持 `linux/amd64` 和 `linux/arm64`。
相同的标签也已发布到 `ghcr.io/swimmwatch/cloakbrowser-mcp`。

若要在 Docker 中运行本地 Streamable HTTP 服务，请将端口发布到回环地址，并在容器内部绑定服务器：

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

若要从 Docker 直接使用 HTTPS，请挂载您的证书文件并选择 HTTPS：

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

可流式传输的 HTTP 模式会将监听的 MCP 端点 URL 和请求日志写入标准输出（stdout）。stdio 模式不会输出常规操作日志，因此 MCP JSON-RPC 的标准输出保持协议纯净。

当可重复性至关重要时，请将版本固定：

```bash
docker pull {{ project.docker_image }}
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  {{ project.docker_image }}
```

## MCP 客户端配置

大多数本地 MCP 客户端与 stdio 和 npm 配合使用效果最佳：

```bash
npx -y cloakbrowser-mcp@latest
```

若需可重复的运行时环境，请使用 Docker。保留 `-i` 以保持 stdio 连接，并添加 `--init`，以确保浏览器子进程能被正确回收。

对于 Streamable HTTP 客户端，请单独启动服务器，并将客户端 URL 配置为 `http://127.0.0.1:3000/mcp` 或 `https://127.0.0.1:3000/mcp`。 如果设置了 `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` 或 `--http-auth-token` 被设置，则将相同的 Bearer 令牌发送至 `/mcp`， `/healthz` 以及 `/readyz`。

=== “Codex CLI” ===

    注册本地 stdio 服务器：

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    或者将 Codex 连接到一个正在运行的 Streamable HTTP 服务器：

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

=== “克劳德代码” ===

    注册本地 stdio 服务器：

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    或者将 Claude Code 连接到一个正在运行的 Streamable HTTP 服务器：

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

=== “Claude Desktop” ===

    将该服务器添加到 `mcpServers` 下的 `claude_desktop_config.json` 中，然后重启 Claude Desktop：

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== “Cursor / Cline” ===

    将服务器添加到客户端的 MCP JSON 配置中：

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== “VS Code”

    将服务器添加到工作区 `.vscode/mcp.json` 或您的用户级 `mcp.json`：

    ```json
    {
      "servers": {
        "cloakbrowser": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== “继续”

    创建 `.continue/mcpServers/cloakbrowser-mcp.yaml`：

    ```yaml
    name: CloakBrowser MCP
    version: 0.0.1
    schema: v1
    mcpServers:
      - name: CloakBrowser
        type: stdio
        command: npx
        args:
          - -y
          - cloakbrowser-mcp@latest
    ```

=== “风帆冲浪 / 卡斯卡德”

    在 Windsurf 中，打开“设置” > “工具” > “Windsurf 设置” > “添加服务器”，或编辑 `~/.codeium/mcp_config.json`：

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

    对于已经运行的 Streamable HTTP 服务器，请使用 `serverUrl`：

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== “Goose” ===

    添加一个自定义的 MCP 扩展，并使用以下命令：

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    请将 `cloakbrowser` 作为扩展名，并将 stdio 作为传输方式。

=== “曲速” ===

    在 Warp 中，打开“设置” > “代理” > “MCP 服务器”，选择“添加”，然后粘贴：

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

    对于已经运行的 Streamable HTTP 服务器，请使用 URL 条目：

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "url": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== “Docker” ===

    当您的客户端能够执行本地 Docker 命令时，请使用此方法：

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

## 验证

请让 MCP 客户端列出工具。您应该会看到上游 Playwright MCP 浏览器工具，此外还有：

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`
