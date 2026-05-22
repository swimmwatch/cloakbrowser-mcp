---
description: Docker usage for CloakBrowser MCP.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

The published image is the recommended runtime for repeatable MCP usage.

## Run

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  ghcr.io/swimmwatch/cloakbrowser-mcp:latest
```

Artifacts are written to `/data` in the container. Mount that path to keep screenshots, snapshots, downloads, and network output.

## Defaults

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` |

## MCP Client Config

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

## Build Locally

```bash
npm run docker:build
npm run docker:smoke
```

The Dockerfile uses the pinned official Playwright MCP image as the runtime base and installs the bridge under `/opt/cloakbrowser-mcp`.
