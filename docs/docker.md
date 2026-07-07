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
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Artifacts are written to `/data` in the container. Mount that path to keep screenshots, snapshots, downloads, and network output.

`--init` is recommended because browser automation can create short-lived child processes. Docker's init process reaps those children cleanly.

The same release tags are published to Docker Hub as `swimmwatch/cloakbrowser-mcp` and to GHCR as `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Persistent Profiles

Docker does not enable a persistent browser profile by default. Use the existing
`/data` volume as the persistence root when you want cookies, local storage,
cache, or extension state to survive container restarts:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Environment variables inside Docker must use container paths such as
`/data/profiles/default`, not host paths. The bridge creates the profile
directory if it is missing, verifies it is writable, writes the container path
to generated Playwright MCP config, and rejects duplicate active profile
directories inside one server process.

## Chrome Extensions

Chrome extensions require a persistent profile and must be mounted separately.
Use container paths in environment variables, not host paths. The extension
mount can be read-only:

```bash
docker run --rm --init -i \
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
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

For direct HTTPS from the container, mount your certificate files and select HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
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
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

For authenticated proxies, embed credentials in the proxy URL and percent-encode
special characters in the username or password.

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
