---
description: Run the CloakBrowser MCP Docker image for repeatable Playwright MCP browser automation with persistent /data profiles, extension mounts, and CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

The published image is the recommended runtime for repeatable MCP usage.

Use the [Docker Streamable HTTP reverse proxy recipe](recipes/docker-streamable-http-reverse-proxy.md) when you want a short deployment path for an already-running HTTP server behind TLS and authentication.

## Run

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Artifacts are written to `/data` in the container. Mount that path to keep screenshots, snapshots, downloads, and network output.

The image already runs Tini as PID 1 and subreaper, so normal commands do not need an extra Docker init process.

The same release tags are published to Docker Hub as `swimmwatch/cloakbrowser-mcp` and to GHCR as `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Headed Sessions And Virtual Display

The image defaults to `PLAYWRIGHT_MCP_HEADLESS=true`; headless sessions do not start Xvfb. When a session requests `headless: false`, the launcher starts one container-private Xvfb display on demand, waits for it to become usable, and retains it until the container exits. Concurrent headed HTTP sessions share that display while their Playwright browser contexts, pages, profiles, and artifacts remain isolated.

For a headed stdio session, set the standard Playwright MCP variable:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

This is not a visible desktop or a GUI streaming service: the image does not provide VNC, noVNC, RDP, host X11 access, or display capture. Do not treat native X11 focus, clipboard, or display capture as tenant-isolation boundaries. The launcher stops the display during shutdown; startup failure or an MCP CLI exit shuts down the container instead of leaving a usable bridge behind.

Outside this image, a headed browser still requires a usable display environment. Set `PLAYWRIGHT_MCP_HEADLESS=true` when a display is unavailable.

## Container Health And Restricted Runtime

The Docker `HEALTHCHECK` uses a private Unix socket and actively verifies that the MCP CLI event loop responds. If Xvfb has been started, it also verifies the X11 display; a headless container whose display was never requested remains healthy. Display startup, shutdown, or failure is unhealthy. The X11 response probe is bounded to 1 second, the CLI response to 750 milliseconds, the private health request to 2.5 seconds, and Docker terminates one health command after 3 seconds. With Docker's 2-second interval and two retries, state transitions depend on Docker scheduling and are not an availability-service-level objective. This check is separate from the public HTTP `/healthz` and `/readyz` endpoints and never sends traffic through MCP stdio. It does not prove that a browser, MCP session, or remote site is usable; an external orchestrator owns restart and recovery.

The launcher gives each child process up to 8 seconds to exit after `SIGTERM`, then up to 2 seconds after `SIGKILL`; a Docker stop timeout must allow for the sequential CLI and Xvfb shutdown. The image runs as the non-root `node` user and can run with a read-only root filesystem. Keep `/data` mounted for artifacts and provide writable temporary mounts for `/tmp` and `/tmp/.X11-unix` when headed sessions are possible. The health socket is owner-only (`0600`). The container-local X11 socket is shared between the `node` process and Xvfb, so it is not a tenant-isolation boundary. Do not mount either socket from the host or share it between containers.

## Persistent Profiles

Docker does not enable a persistent browser profile by default. Use the existing
`/data` volume as the persistence root when you want cookies, local storage,
cache, or extension state to survive container restarts:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Environment variables inside Docker must use container paths such as
`/data/profiles/default`, not host paths. The bridge creates the profile
directory if it is missing, verifies it is writable, writes the container path
to generated Playwright MCP config, and rejects duplicate active profile
directories inside one server process.

## CloakBrowser License Cache

The image stores CloakBrowser binaries, license state, and validation cache in
`/home/node/.cloakbrowser`. Mount a named volume there to retain a GitHub
free-tier or Pro login across container replacement:

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

Use the same volume with the upstream `info` or `logout` command to inspect or
remove the saved login. As an alternative, inject
`CLOAKBROWSER_LICENSE_KEY` through your container secret management. Do not put
license keys in image layers, Compose files committed to source control, or
command output captured as build evidence.

## Chrome Extensions

Chrome extensions require a persistent profile and must be mounted separately.
Use container paths in environment variables, not host paths. The extension
mount can be read-only:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Use a JSON array for `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` when a path contains
commas or when passing multiple extension directories. Restart the container
after changing extension files or extension paths.

## Streamable HTTP

For local Streamable HTTP usage, publish the container port on loopback:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

For headed HTTP sessions, set `PLAYWRIGHT_MCP_HEADLESS=false` on the container. Individual initialize requests may still select headless mode through the supported MCP metadata.

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

For direct HTTPS from the container, mount your certificate files and select HTTPS:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

The host-side `127.0.0.1:3000` bind keeps the endpoint local. If you publish Streamable HTTP on a non-loopback interface, use HTTPS plus authentication, or place the server behind a trusted TLS-terminating reverse proxy with authentication and network controls.
Streamable HTTP exposes fixed `GET /healthz` and `GET /readyz` probes on the same host and port. If `--http-auth-token` or `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` is configured, the probes require the same `Authorization: Bearer ...` header as MCP requests.
See the generated [CLI Reference](generated/cli.md) for all HTTP transport flags and environment variables.

For a complete reverse-proxy-oriented example, see [Docker Streamable HTTP Behind Reverse Proxy](recipes/docker-streamable-http-reverse-proxy.md).

## GeoIP Proxy Matching

Docker uses the same proxy and GeoIP environment variables as npm. Enable
GeoIP proxy matching when regional QA needs CloakBrowser timezone, language, and
locale fingerprints to follow the configured proxy location:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

For authenticated proxies, embed credentials in the proxy URL and percent-encode
special characters in the username or password. Supported CloakBrowser binaries
use native inline proxy authentication; older binaries fall back to the
Playwright proxy object.

When the container runs Streamable HTTP, clients can also choose different
proxies per MCP session through `initialize` metadata. See
[GeoIP Proxy Matching](geoip-proxy-matching.md) for runtime proxy metadata,
multi-region use cases, limitations, and the [regional QA recipe](recipes/regional-qa-through-proxy.md).

## Defaults

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
