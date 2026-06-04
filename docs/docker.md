---
description: Run the CloakBrowser MCP Docker image for repeatable Playwright MCP browser automation with CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

The published image is the recommended runtime for repeatable MCP usage.

## Run

```bash
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Artifacts are written to `/data` in the container. Mount that path to keep screenshots, snapshots, downloads, and network output.

`--init` is recommended because browser automation can create short-lived child processes. Docker's init process reaps those children cleanly.

The same release tags are published to Docker Hub as `swimmwatch/cloakbrowser-mcp` and to GHCR as `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Streamable HTTP

For local Streamable HTTP usage, publish the container port on loopback:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

The host-side `127.0.0.1:3000` bind keeps the endpoint local. If you publish Streamable HTTP on a non-loopback interface, put it behind authentication, TLS, and network controls.
See the generated [CLI Reference](generated/cli.md) for all HTTP transport flags and environment variables.

## Defaults

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` |
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

## Build Locally

```bash
npm run docker:build
npm run docker:smoke
```

The Dockerfile uses the pinned official Playwright MCP image as the runtime base, applies available Debian security updates during the build, removes the unused global npm payload from the runtime image, and installs the bridge under `/opt/cloakbrowser-mcp`.

The release workflow publishes SBOM and provenance attestations, includes OCI labels for source, revision, version, license, base image name, and base image digest, and scans the built image with Trivy before publishing.
