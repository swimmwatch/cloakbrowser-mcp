---
description: Install and run CloakBrowser MCP from npm or Docker.
icon: material/rocket-launch
tags:
  - User Guide
---

# Getting Started

Use the published npm package or Docker image. Installing from source is only needed for development.

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
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  ghcr.io/swimmwatch/cloakbrowser-mcp:latest
```

Docker is the most reproducible runtime because the image is based on the pinned official Playwright MCP image and includes a prepared CloakBrowser browser cache.

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
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "ghcr.io/swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Common Clients

Use the npm config for local Node.js environments and the Docker config for isolated runtimes. These shapes work in clients that accept JSON MCP server definitions, including Codex, Cursor, Cline, Continue, Gemini CLI, Claude-compatible desktop clients, VS Code MCP configuration, Windsurf, Warp, and similar tools.

For clients that use TOML or YAML, keep the same command and argument values and translate only the surrounding syntax.

## Verify

Ask the MCP client to list tools. You should see upstream Playwright MCP browser tools plus:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`
