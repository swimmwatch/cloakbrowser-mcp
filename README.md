# cloakbrowser-mcp

<p align="center">
  <img src="docs/assets/brand/logo-wordmark.svg" alt="CloakBrowser MCP" width="640" />
</p>

[![CI](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/swimmwatch/cloakbrowser-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/swimmwatch/cloakbrowser-mcp)
[![Actionlint](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/actionlint.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/actionlint.yml)
[![CodeQL](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/codeql.yml)
[![Dependency Review](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/dependency-review.yml)
[![OpenSSF Scorecard](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/scorecard.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/scorecard.yml)
[![Zizmor](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/zizmor.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/zizmor.yml)
[![Release](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/release.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/release.yml)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-published-2E8555)](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch%2Fcloakbrowser-mcp)
[![cloakbrowser-mcp MCP server](https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp/badges/score.svg)](https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp)
[![npm](https://img.shields.io/npm/v/cloakbrowser-mcp.svg?logo=npm)](https://www.npmjs.com/package/cloakbrowser-mcp)
[![Docker Hub pulls](https://img.shields.io/docker/pulls/swimmwatch/cloakbrowser-mcp?logo=docker&label=Docker%20Hub)](https://hub.docker.com/r/swimmwatch/cloakbrowser-mcp)
[![Node.js >=22.12](https://img.shields.io/badge/Node.js-%3E%3D22.12-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Cross-platform](https://img.shields.io/badge/Cross--platform-Linux%20%7C%20macOS%20%7C%20Windows-2563eb)](docs/version-compatibility.md)
[![Available on CodeGuilds](https://img.shields.io/badge/Available_on-CodeGuilds-6366f1)](https://codeguilds.dev/packages/cloakbrowser-mcp)
[![MCP Server](https://img.shields.io/badge/MCP-server-000000)](https://modelcontextprotocol.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](docs/docker.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

`cloakbrowser-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io/) browser automation server that runs upstream [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) with the [CloakBrowser](https://github.com/CloakHQ/CloakBrowser) Chromium binary. It provides Playwright MCP-compatible tools through a thin CloakBrowser bridge for npm and Docker users over stdio or Streamable HTTP, including GeoIP-aware proxy matching for regional QA.

Documentation: [swimmwatch.github.io/cloakbrowser-mcp](https://swimmwatch.github.io/cloakbrowser-mcp/)

Cross-platform checks cover npm on Linux x64/arm64, macOS arm64/x64, and Windows x64 across Node.js 22-26. Docker images are built and smoke-tested for `linux/amd64` and `linux/arm64`.

The server is intentionally thin:

- upstream Playwright MCP owns browser tool schemas, descriptions, and responses;
- this package generates a Playwright MCP config that points `launchOptions.executablePath` to CloakBrowser;
- the bridge exposes upstream tools unchanged;
- the only local tools are `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.

## Version compatibility

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | CloakBrowser | Node.js   | Platform                                                                                  |
| ---------------- | --------------- | ------------ | --------- | ----------------------------------------------------------------------------------------- |
| `1.4.0`          | `^0.0.76`       | `^0.3.32`    | `>=22.12` | npm on Linux x64/arm64, macOS arm64/x64, Windows x64; Docker `linux/amd64`, `linux/arm64` |
| `1.3.0`          | `^0.0.75`       | `^0.3.31`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.2.7`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.2.6`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.2.5`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.2.3`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.2.2`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.2.1`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.2.0`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.1.0`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.0.2`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.0.1`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |
| `1.0.0`          | `^0.0.75`       | `^0.3.30`    | `>=20`    | Docker `linux/amd64`, Node.js local                                                       |

<!-- compatibility-table:end -->

See [Version Compatibility](docs/version-compatibility.md) for the maintained compatibility table.

## Registry visibility

`cloakbrowser-mcp` publishes `server.json` to the official [MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch%2Fcloakbrowser-mcp). GitHub's [`github.com/mcp`](https://github.com/mcp) registry is a separate curated discovery surface, so an official MCP Registry release may not appear there immediately.

Verify the current official registry entry and GitHub MCP visibility probe with:

```bash
npm run registry:check
```

Use `npm run registry:check:strict` only when GitHub MCP listing visibility should be treated as a required release gate.

## Run from npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

Requires Node.js 22.12 or newer. The first real browser action may download the CloakBrowser binary unless it is already cached.
Use `doctor` for local diagnostics before connecting an MCP client. It checks the Node.js engine, project metadata, upstream Playwright MCP resolution, and CloakBrowser binary metadata without starting the bridge or downloading a browser.
The default transport is stdio. Streamable HTTP binds to `127.0.0.1` by default, serves MCP at `/mcp`, and exposes fixed `GET /healthz` and `GET /readyz` probes. Use `--http-protocol https` with `--https-cert` and `--https-key` or `--https-pfx` for direct TLS. If `--http-auth-token` is set, the probes require the same `Authorization: Bearer ...` header as MCP requests.
For the complete generated CLI flag reference, see the published [CLI Reference](https://swimmwatch.github.io/cloakbrowser-mcp/generated/cli/).

## Run from Docker

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest

docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

For direct HTTPS from the container, mount your TLS files and select HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

The Docker image is based on the pinned official Playwright MCP image, installs the bridge under `/opt/cloakbrowser-mcp`, writes artifacts to `/data` by default, and is published for `linux/amd64` and `linux/arm64`.
The same tags are also published to `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## MCP client configuration

### npm

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest"],
      "env": {
        "PLAYWRIGHT_MCP_OUTPUT_DIR": "/tmp/cloakbrowser-artifacts",
        "PLAYWRIGHT_MCP_HEADLESS": "true"
      }
    }
  }
}
```

### Docker

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

## Configuration

Use upstream `PLAYWRIGHT_MCP_*` variables for browser, artifact, timeout, network, and tool capability settings. Cloak-specific bridge toggles use `CLOAK_PLAYWRIGHT_MCP_*`.
CLI flags are documented in the generated [CLI Reference](https://swimmwatch.github.io/cloakbrowser-mcp/generated/cli/).
GeoIP proxy matching and Streamable HTTP runtime proxy metadata are documented in [GeoIP Proxy Matching](docs/geoip-proxy-matching.md).

Common variables:

| Variable | Default | Description |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | MCP transport exposed by the bridge: `stdio` or `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Streamable HTTP listener protocol: `http` or `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Streamable HTTP bind host. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Streamable HTTP bind port. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Streamable HTTP endpoint path. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Optional Bearer token for Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Session metadata backend. Only `memory` is implemented in this release. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Idle TTL for Streamable HTTP sessions. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Maximum active Streamable HTTP sessions in one process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | TLS certificate PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | TLS private key PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | TLS PFX/PKCS12 path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Passphrase for an encrypted HTTPS key or PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Streamable HTTP operational log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Upstream Playwright MCP proxy server. Used as the GeoIP source when matching is enabled. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Upstream proxy bypass list for hosts that should not use `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Match CloakBrowser timezone and locale fingerprint flags to `PLAYWRIGHT_MCP_PROXY_SERVER` GeoIP. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses CloakBrowser. `playwright` uses the upstream Playwright MCP browser runtime. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium headless. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm usage. Docker defaults to `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the compatibility patch for console messages. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium launch arguments. |

Streamable HTTP clients can override the proxy per MCP session by passing bridge
metadata in the `initialize` request:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true
      }
    }
  }
}
```

Runtime proxy metadata overrides `PLAYWRIGHT_MCP_PROXY_SERVER` and
`PLAYWRIGHT_MCP_PROXY_BYPASS` for that HTTP session only. Stdio keeps using
process-level environment and CLI configuration.

Enable `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` to align CloakBrowser
timezone, language, and locale fingerprint flags with the selected proxy
location. Streamable HTTP clients can set `geoipProxyMatch` per session to run
different regional QA scenarios from one server process.

The old `CLOAKBROWSER_MCP_*` variables are not supported.

## Tools

The upstream Playwright MCP tool list is authoritative. This project does not reimplement or re-document upstream browser schemas in source code.

Local tools:

- `cloakbrowser_binary_info` returns CloakBrowser package, platform, cache, and resolved binary data.
- `cloakbrowser_bridge_info` returns bridge metadata, upstream package/version, and local tool names.

## Development

```bash
npm install
npm run build
npm test
npm run docker:build
npm run docker:smoke
npm run server:validate
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Documentation starts at [docs/getting-started.md](docs/getting-started.md). Contributor material is grouped under [docs/contributor-guide.md](docs/contributor-guide.md).
