# Docker

Use the Docker image when you want an isolated MCP server runtime with the CloakBrowser browser cache prepared inside the image.

## Run the published image

For normal use, pull the published GHCR image and run it through your MCP client:

```bash
docker pull ghcr.io/swimmwatch/cloakbrowser-mcp:latest

docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  -e CLOAKBROWSER_MCP_LOG_LEVEL=info \
  ghcr.io/swimmwatch/cloakbrowser-mcp:latest
```

To pin a release, use the exact image tag:

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  ghcr.io/swimmwatch/cloakbrowser-mcp:7.0.0
```

The image expects stdio to be connected to an MCP client. It writes artifacts such as screenshots, PDFs, traces, videos, and HAR files under `/data`.

## MCP client configuration

```jsonc
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/abs/path/cloakbrowser-artifacts:/data",
        "-e",
        "CLOAKBROWSER_MCP_LOG_LEVEL=info",
        "ghcr.io/swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

Use an absolute host path for the artifact mount. The server never writes logs to `stdout`; logs go to `stderr` so the MCP JSON-RPC stream stays clean.

## Runtime defaults

The published image sets:

- `CLOAKBROWSER_MCP_OUTPUT_DIR=/data`
- `CLOAKBROWSER_MCP_LOG_LEVEL=info`
- `CLOAKBROWSER_CACHE_DIR=/home/app/.cloakbrowser`
- `CLOAKBROWSER_AUTO_UPDATE=false`

Mount `/data` to persist artifacts outside the container. If you need different server behavior, pass the same environment variables and CLI flags described in [Configuration](configuration.md).

## Browser runtime cache

The image includes the `cloakbrowser` npm package and a pre-populated CloakBrowser Chromium cache. Runtime auto-update checks are disabled for repeatability. Rebuild or pull a newer image to pick up a newer upstream CloakBrowser binary.

If you operate your own browser cache, override `CLOAKBROWSER_CACHE_DIR` or mount the upstream CloakBrowser cache directory into the container.

## Local development image

This section is for contributors who want to test changes before release.

```bash
npm run docker:build      # docker buildx build --load -t cloakbrowser-mcp:dev .
npm run docker:smoke      # docker run --rm cloakbrowser-mcp:dev --help

docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  -e CLOAKBROWSER_MCP_LOG_LEVEL=debug \
  cloakbrowser-mcp:dev
```

The build target uses Docker Buildx because the Dockerfile uses BuildKit cache mounts for npm, apt, and the CloakBrowser browser download. The smoke target runs the CLI `--help` path and does not launch a browser. CI exercises the same smoke path.

## Image internals

The Dockerfile is multi-stage:

- Uses `node:22-bookworm-slim` for build and runtime stages.
- Installs npm dependencies from `package-lock.json` with a BuildKit npm cache mount.
- Builds TypeScript in a source-dependent stage.
- Prunes production dependencies in a source-independent stage, so source changes do not invalidate the production `node_modules` layer.
- Downloads the CloakBrowser Chromium binary during image build and reuses a BuildKit cache mount for the download cache.
- Installs standard headless-Chromium runtime libraries.
- Prepares `/data`, then drops privileges before starting the MCP server.

Bind-mounted artifact directories are handled by running the server as the directory owner. Root-owned Docker volumes run as the image `app` user.

## Published tags

When a GitHub release is published, the `docker-release` workflow pushes:

- `ghcr.io/swimmwatch/cloakbrowser-mcp:<version>`
- `ghcr.io/swimmwatch/cloakbrowser-mcp:latest` for non-prerelease releases

Prereleases publish only their version tag, not `latest`.

## Platforms

The release image is currently `linux/amd64` only. `linux/arm64` is deferred until CloakBrowser binary distribution is validated for arm64.
