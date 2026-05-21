# cloakbrowser-mcp

<p align="center">
  <img src="docs/assets/brand/logo-wordmark.svg" alt="CloakBrowser MCP" width="640" />
</p>

[![CI](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/ci.yml)
[![Actionlint](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/actionlint.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/actionlint.yml)
[![NPM Release](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/npm-release.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/npm-release.yml)
[![Docker Release](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/docker-release.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/docker-release.yml)
[![Docs Release](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/docs-release.yml/badge.svg)](https://github.com/swimmwatch/cloakbrowser-mcp/actions/workflows/docs-release.yml)
[![npm](https://img.shields.io/npm/v/cloakbrowser-mcp.svg?logo=npm)](https://www.npmjs.com/package/cloakbrowser-mcp)
[![Node.js >=20](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP Server](https://img.shields.io/badge/MCP-server-000000)](https://modelcontextprotocol.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](docs/docker.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes [CloakBrowser](https://github.com/CloakHQ/cloakbrowser) — a stealth Chromium automation library — as tools for AI agents.

> **Status:** early foundation. Current version: <!-- project-version -->v1.0.0<!-- /project-version -->. Playwright MCP-compatible tools and CloakBrowser extension tools are implemented and tested.
> **License:** MIT (see [LICENSE](LICENSE)).

The npm and Docker commands below are the intended release commands. Until the first release is published, use the source-checkout path under [Project development](#project-development).

## What it does

- Runs an MCP stdio server that wraps a real Chromium browser via CloakBrowser.
- Exposes the full **23-tool Playwright MCP-compatible browser surface**, default project tools, and capability-gated CloakBrowser extensions.
- Validates every tool input with `zod`, exposes explicit runtime configuration, and enforces an origin allow/deny list at navigation time.
- Advertises MCP implementation metadata (`name`, `title`, `version`, `description`, `websiteUrl`, `icons`, and usage instructions) during initialization.

## What it intentionally does not do

- No CAPTCHA solving, access-control bypass, or anti-bot evasion claims.
- Unsafe tools such as `browser_evaluate` and `browser_run_code_unsafe` are available for Playwright MCP parity. Treat this MCP server as trusted-code execution infrastructure.

## Run from npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest --log-level=info
```

To pin a release, use the exact npm version:

```bash
npx -y cloakbrowser-mcp@7.0.0 --log-level=info
```

Requires Node.js **≥ 20**.

## Run from Docker

```bash
docker pull ghcr.io/swimmwatch/cloakbrowser-mcp:latest
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  -e CLOAKBROWSER_MCP_LOG_LEVEL=info \
  ghcr.io/swimmwatch/cloakbrowser-mcp:latest
```

The Docker image writes artifacts to `/data` and includes a prepared CloakBrowser browser cache.

## MCP client configuration

The server uses stdio transport. It never writes logs to `stdout`; logs go to `stderr`.

### npm

```jsonc
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest", "--log-level", "info"],
      "env": {
        "CLOAKBROWSER_MCP_OUTPUT_DIR": "/tmp/cloakbrowser-artifacts"
      }
    }
  }
}
```

### Docker

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
        "/tmp/cloakbrowser-artifacts:/data",
        "-e",
        "CLOAKBROWSER_MCP_LOG_LEVEL=info",
        "ghcr.io/swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

Full install guide: [docs/getting-started.md](docs/getting-started.md). Docker runtime details: [docs/docker.md](docs/docker.md).

## Published metadata

The project includes MCP Registry-ready metadata:

- `package.json` declares `mcpName: "io.github.swimmwatch/cloakbrowser-mcp"` for npm ownership verification.
- `server.json` declares the same server name, package metadata for npm and GHCR, stdio transport, and common runtime environment variables.
- The Docker image declares `io.modelcontextprotocol.server.name=io.github.swimmwatch/cloakbrowser-mcp` for OCI ownership verification.

## Tools

Currently registered by default (28): `browser_close`, `browser_resize`, `browser_console_messages`, `browser_handle_dialog`, `browser_evaluate`, `browser_file_upload`, `browser_drop`, `browser_fill_form`, `browser_press_key`, `browser_type`, `browser_navigate`, `browser_navigate_back`, `browser_network_requests`, `browser_network_request`, `browser_run_code_unsafe`, `browser_take_screenshot`, `browser_snapshot`, `browser_click`, `browser_drag`, `browser_hover`, `browser_select_option`, `browser_tabs`, `browser_wait_for`, `browser_verify_text`, `browser_verify_selector_count`, `browser_verify_url`, `browser_get_config`, `cloakbrowser_binary_info`.

The 23 Playwright MCP tool names are registered by default with matching names, similar input contracts, and similar descriptions. Project-specific default additions are `browser_get_config`, `cloakbrowser_binary_info`, and read-only verify helpers. PDF, storage mutation, network interception, tracing/HAR/video, coordinate input, and binary installation tools are available behind capability flags.

Full per-tool reference: [docs/tools.md](docs/tools.md).

## Capability flags

All default **off** except `allowScreenshots`. Disabled capabilities skip registration for tools that declare them, so clients see those tools as absent rather than as failing calls.

The full capability reference and security implications are generated from source code in [docs/configuration.md](docs/configuration.md#capability-flags).

## Security model

- stdio transport reserved for MCP JSON-RPC; logs go to `stderr` via pino.
- All artifacts written under a single configured directory; absolute paths and `..` traversal are rejected.
- Origin allow/deny list enforced at navigation time.
- `browser_run_code_unsafe` executes JavaScript in the server process and is equivalent to giving the MCP client code execution.

Threat model and responsible-use statement: [docs/security.md](docs/security.md) and [SECURITY.md](SECURITY.md).

## Project development

Contributor documentation is grouped under [docs/contributor-guide.md](docs/contributor-guide.md). Start there for development, testing, architecture, release, and roadmap details.

Source checkout:

```bash
git clone https://github.com/swimmwatch/cloakbrowser-mcp.git
cd cloakbrowser-mcp
npm install
npm run build
node dist/cli.js --help
```

Local Docker image:

```bash
npm run docker:build
npm run docker:smoke
docker run --rm -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

Testing:

```bash
npm test                  # unit + integration + contract
npm run test:unit
npm run test:integration
npm run test:contract
npm run test:coverage     # v8 coverage, thresholds enforced
npm run test:real         # gated by CLOAKBROWSER_MCP_REAL_BROWSER=1
```

Full testing guide: [docs/testing.md](docs/testing.md).

Local preview (requires Python 3.10+):

```bash
npm run docs:install
npm run docs:serve        # mkdocs serve
npm run docs:build        # mkdocs build --strict
```

Site source in [`docs/`](docs/). The docs release workflow ([.github/workflows/docs-release.yml](.github/workflows/docs-release.yml)) deploys to GitHub Pages on `release.published`.

Publishing is driven by GitHub releases:

- [`.github/workflows/npm-release.yml`](.github/workflows/npm-release.yml) publishes the Node.js package to npm as the `cloakbrowser-mcp` MCP server package.
- [`.github/workflows/docker-release.yml`](.github/workflows/docker-release.yml) publishes the Docker image to GHCR.
- [`.github/workflows/docs-release.yml`](.github/workflows/docs-release.yml) publishes the documentation site.

The npm workflow uses npm Trusted Publishing with GitHub Actions OIDC, not a long-lived npm token. Before the first release, configure npm trusted publishing for this repository and the workflow filename `npm-release.yml`.

Before publishing, the npm workflow installs from a clean release job without dependency caching, verifies npm registry signatures, rejects duplicate package versions, packs the npm tarball, installs that tarball in a temporary project, checks the CLI and public exports, uploads the verified tarball as a workflow artifact, then publishes that exact tarball.

Release versions are sourced from the GitHub release tag. The release workflows run `scripts/apply-release-version.mjs` so the tag is applied to `package.json`, `package-lock.json`, `server.json`, and version-marked documentation before publishing.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Operating manual for AI agents working in this repo: [AGENTS.md](AGENTS.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md). All current work lives under the **Unreleased** section — no releases have been published.

## License

This project is licensed under the [MIT License](LICENSE). The npm package metadata uses `license: "MIT"`.

## Roadmap

Full milestones, acceptance criteria, and explicitly excluded capabilities: [docs/roadmap.md](docs/roadmap.md).
