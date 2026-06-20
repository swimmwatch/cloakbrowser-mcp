---
description: Install and run CloakBrowser MCP from npm or Docker.
icon: material/rocket-launch
tags:
  - User Guide
---

# Getting Started

Use the published npm package or Docker image. Installing from source is only needed for development.

Choose npm when your MCP client already runs on your machine and Node.js is available. Choose Docker when you want a repeatable runtime with the upstream Playwright MCP base image and the CloakBrowser cache prepared inside the container.

For a quick overview of common setup questions, see the [FAQ](faq.md).

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

Pin a release when reproducibility matters:

```bash
npx -y cloakbrowser-mcp@1.3.1
```

The npm package requires Node.js 22.12 or newer. CloakBrowser downloads its Chromium binary on first use unless it is already cached.

Use `doctor` to verify the local Node.js runtime, package metadata, upstream Playwright MCP CLI resolution, and CloakBrowser binary metadata before connecting a client. The command does not start the bridge or download a browser.

The default transport is stdio. Use `--transport streamable-http` when your MCP client connects to an HTTP endpoint instead of spawning a stdio process. The HTTP endpoint defaults to `http://127.0.0.1:3000/mcp`, with fixed `GET /healthz` and `GET /readyz` probes on the same host and port. Use `--http-protocol https` with `--https-cert` and `--https-key` or `--https-pfx` when the bridge should terminate TLS directly.
See the generated [CLI Reference](generated/cli.md) for the full flag list and matching environment variables.

## Docker

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker is the most reproducible runtime because the image is based on the pinned official Playwright MCP image and includes a prepared CloakBrowser browser cache. Published images support `linux/amd64` and `linux/arm64`.
The same tags are also published to `ghcr.io/swimmwatch/cloakbrowser-mcp`.

For local Streamable HTTP with Docker, publish the port on loopback and bind the server inside the container:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

For direct HTTPS from Docker, mount your certificate files and select HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Streamable HTTP mode writes the listening MCP endpoint URL and request logs to stdout. Stdio mode does not emit routine operational logs so MCP JSON-RPC stdout remains protocol-clean.

Pin a release when reproducibility matters:

```bash
docker pull swimmwatch/cloakbrowser-mcp:1.3.1
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:1.3.1
```

## MCP Client Config

Most local MCP clients work best with stdio and npm:

```bash
npx -y cloakbrowser-mcp@latest
```

Use Docker when you want a repeatable runtime. Keep `-i` so stdio stays connected and add `--init` so browser child processes are reaped correctly.

For Streamable HTTP clients, start the server separately and configure the client URL as `http://127.0.0.1:3000/mcp` or `https://127.0.0.1:3000/mcp`. If `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` or `--http-auth-token` is set, send the same Bearer token to `/mcp`, `/healthz`, and `/readyz`.

=== "Codex CLI"

    Register the local stdio server:

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Or connect Codex to an already-running Streamable HTTP server:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

=== "Claude Code"

    Register the local stdio server:

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Or connect Claude Code to an already-running Streamable HTTP server:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

=== "Claude Desktop"

    Add the server under `mcpServers` in `claude_desktop_config.json`, then restart Claude Desktop:

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

=== "Cursor / Cline"

    Add the server to the client's MCP JSON configuration:

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

=== "VS Code"

    Add the server to workspace `.vscode/mcp.json` or your user-level `mcp.json`:

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

=== "Continue"

    Create `.continue/mcpServers/cloakbrowser-mcp.yaml`:

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

=== "Windsurf / Cascade"

    In Windsurf, open Settings > Tools > Windsurf Settings > Add Server, or edit `~/.codeium/mcp_config.json`:

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

    For an already-running Streamable HTTP server, use `serverUrl`:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== "Goose"

    Add a custom MCP extension and use this command:

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    Use `cloakbrowser` as the extension name and stdio as the transport.

=== "Warp"

    In Warp, open Settings > Agents > MCP servers, choose Add, then paste:

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

    For an already-running Streamable HTTP server, use a URL entry:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "url": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== "Docker"

    Use this when your client can spawn a local Docker command:

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

## Verify

Ask the MCP client to list tools. You should see upstream Playwright MCP browser tools plus:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`
