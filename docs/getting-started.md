---
description: Install and run CloakBrowser MCP from npm or Docker.
icon: material/rocket-launch
tags:
  - User Guide
---

# Getting Started

Use the published npm package or Docker image. Installing from source is only needed for development.

Choose npm when your MCP client already runs on your machine and Node.js is available. Choose Docker when you want a repeatable runtime with the upstream Playwright MCP base image and the CloakBrowser cache prepared inside the container.

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest
```

Pin a release when reproducibility matters:

```bash
npx -y cloakbrowser-mcp@1.0.0
```

The npm package requires Node.js 20 or newer. CloakBrowser downloads its Chromium binary on first use unless it is already cached.

## Docker

```bash
docker pull ghcr.io/swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  ghcr.io/swimmwatch/cloakbrowser-mcp:latest
```

Docker is the most reproducible runtime because the image is based on the pinned official Playwright MCP image and includes a prepared CloakBrowser browser cache.

Pin a release when reproducibility matters:

```bash
docker pull ghcr.io/swimmwatch/cloakbrowser-mcp:1.0.0
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  ghcr.io/swimmwatch/cloakbrowser-mcp:1.0.0
```

## MCP Client Config

Most MCP clients use the same stdio shape: `command`, optional `args`, and optional `env`.

### npm Config

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest"],
      "env": {
        "PLAYWRIGHT_MCP_HEADLESS": "true",
        "PLAYWRIGHT_MCP_OUTPUT_DIR": "/tmp/cloakbrowser-artifacts"
      }
    }
  }
}
```

### Docker Config

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
        "ghcr.io/swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Client Examples

Use the npm config for local Node.js environments and the Docker config for isolated runtimes. Most MCP clients use the same stdio values and only differ in where the JSON is stored.

### Codex

Add a stdio MCP server named `cloakbrowser` with the npm command:

```json
{
  "command": "npx",
  "args": ["-y", "cloakbrowser-mcp@latest"]
}
```

For Docker-backed usage, use the Docker command from the Docker config above.

### Claude Desktop

Add the server under `mcpServers` in `claude_desktop_config.json`:

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

Restart Claude Desktop after saving the file.

### Claude Code

Register the same stdio server through Claude Code's MCP server configuration. Use:

```text
command: npx
args: -y cloakbrowser-mcp@latest
```

### Cursor

Add the server to Cursor's MCP configuration:

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

### VS Code, Cline, Continue, Windsurf, Goose, Warp

Use the same `mcpServers` JSON shape if the client accepts JSON configuration. For clients that use TOML or YAML, keep the same command and argument values and translate only the surrounding syntax.

When using Docker in any client, keep `-i` so stdio stays connected and add `--init` so browser child processes are reaped correctly.

## Verify

Ask the MCP client to list tools. You should see upstream Playwright MCP browser tools plus:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`
