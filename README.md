# cloakbrowser-mcp

<p align="center">
  <img src="docs/assets/brand/logo-wordmark.svg" alt="CloakBrowser MCP" width="640" />
</p>

[![CI](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/ci.yml)
[![Actionlint](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/actionlint.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/actionlint.yml)
[![CodeQL](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/codeql.yml)
[![Dependency Review](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/dependency-review.yml)
[![OpenSSF Scorecard](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/scorecard.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/scorecard.yml)
[![Zizmor](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/zizmor.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/zizmor.yml)
[![NPM Release](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/npm-release.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/npm-release.yml)
[![Docker Release](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/docker-release.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/docker-release.yml)
[![Docs Release](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/docs-release.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/docs-release.yml)
[![npm](https://img.shields.io/npm/v/cloakbrowser-mcp.svg?logo=npm)](https://www.npmjs.com/package/cloakbrowser-mcp)
[![Node.js >=20](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP Server](https://img.shields.io/badge/MCP-server-000000)](https://modelcontextprotocol.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](docs/docker.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

`cloakbrowser-mcp` is a stdio [Model Context Protocol](https://modelcontextprotocol.io/) browser automation server that runs upstream [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) with the [CloakBrowser](https://github.com/CloakHQ/CloakBrowser) Chromium binary. It provides Playwright MCP-compatible tools through a thin CloakBrowser bridge for npm and Docker users.

Documentation: [swimmwatch.github.io/cloakbrowser-mcp](https://swimmwatch.github.io/cloakbrowser-mcp/)

The server is intentionally thin:

- upstream Playwright MCP owns browser tool schemas, descriptions, and responses;
- this package generates a Playwright MCP config that points `launchOptions.executablePath` to CloakBrowser;
- the bridge exposes upstream tools unchanged;
- the only local tools are `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.

## Version compatibility

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base | CloakBrowser | Node.js | Transport | Platform | Parity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `1.0.1` | `^0.0.75` | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30` | `>=20` | stdio | `linux/amd64` Docker, Node.js local | Upstream default tools compared in CI. |
| `1.0.0` | `^0.0.75` | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30` | `>=20` | stdio | `linux/amd64` Docker, Node.js local | Upstream default tools compared in CI. |

See [Version Compatibility](docs/version-compatibility.md) for the maintained compatibility table.

## Run from npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest
```

Requires Node.js 20 or newer. The first real browser action may download the CloakBrowser binary unless it is already cached.

## Run from Docker

```bash
docker pull ghcr.io/swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  ghcr.io/swimmwatch/cloakbrowser-mcp:latest
```

The Docker image is based on the pinned official Playwright MCP image, installs the bridge under `/opt/cloakbrowser-mcp`, and writes artifacts to `/data` by default.

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
        "ghcr.io/swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Configuration

Use upstream `PLAYWRIGHT_MCP_*` variables for browser, artifact, timeout, network, and tool capability settings. Cloak-specific bridge toggles use `CLOAK_PLAYWRIGHT_MCP_*`.

Common variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses CloakBrowser. `playwright` uses the upstream Playwright MCP browser runtime. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium headless. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm usage. Docker defaults to `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the compatibility patch for console messages. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium launch arguments. |

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
