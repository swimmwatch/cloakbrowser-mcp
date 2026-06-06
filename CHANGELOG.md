# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-06-06

### Added

- Added a project release skill for AI agents to prepare, publish, verify, and
  recover releases.
- Added a project Pull Request skill for AI agents to prepare, create, update,
  and report PRs consistently.
- Added property-based tests for CLI and environment parsing.
- Added agent instructions for supply-chain hardening and GitHub security
  changes.
- Added Streamable HTTP `GET /healthz` and `GET /readyz` probes for health and
  readiness checks.
- Added the `cloakbrowser-mcp doctor` diagnostics command with human and JSON
  output.
- Added a stable upstream Playwright MCP tool list reference to the Tools
  documentation.

### Changed

- Added the Advanced SEO MkDocs plugin for generated documentation metadata.
- Hardened GitHub workflow token permissions and pinned workflow actions.
- Updated CloakBrowser dependency to `^0.3.31`.
- Updated documentation dependency minimums for MkDocs plugins.
- Updated npm development dependency minimums to current compatible releases.
- Expanded Node.js workflow check coverage across major versions 20 through
  26.
- Updated the project Pull Request skill to assign PRs to the authenticated
  GitHub user by default.

## [1.2.7] - 2026-06-04

### Added

- Added Docker Hub publication and MCP Registry metadata for
  `docker.io/swimmwatch/cloakbrowser-mcp` alongside GHCR.
- Added automatic Docker Hub repository overview updates from a
  Docker-specific README.
- Added a Docker Hub pulls badge to the README.

## [1.2.6] - 2026-05-31

### Added

- Added a registry verification script for official MCP Registry, npm package,
  GHCR image, and GitHub MCP Registry visibility checks.
- Added documentation that distinguishes official MCP Registry publication from
  GitHub's curated `github.com/mcp` registry surface.

### Changed

- Refined registry-facing package and server metadata to describe the project
  as a Playwright MCP-compatible browser automation bridge.

## [1.2.5] - 2026-05-27

### Changed

- Replaced the separate npm, Docker, documentation, and MCP Registry release workflows with one unified `Release` workflow.
- Simplified the local `MCP Registry Publish` composite action so npm and Docker publication ordering is handled by workflow job dependencies.
- Added Glama ownership metadata, score badge, and release checklist documentation before the stable `1.2.5` release.

### Fixed

- Added retries with fresh GitHub OIDC login attempts around MCP Registry publishing to tolerate transient registry gateway timeouts.

## [1.2.3] - 2026-05-27

### Changed

- Refactored MCP Registry release publishing into a local `MCP Registry Publish` composite GitHub Action.
- Added a dedicated README badge for the official MCP Registry listing.

## [1.2.2] - 2026-05-27

### Fixed

- Fixed MCP Registry release verification to use the official registry API response shape.
- Made MCP Registry release reruns skip publishing when the target server version is already visible.

## [1.2.1] - 2026-05-27

### Fixed

- Removed the OCI package `registryBaseUrl` from `server.json` so official MCP Registry publishing accepts the GHCR image metadata.
- Added local validation for the official MCP Registry OCI metadata rule.

## [1.2.0] - 2026-05-27

### Added

- Added official MCP Registry publishing through `mcp-publisher` and GitHub Actions OIDC.

## [1.1.0] - 2026-05-24

### Added

- Added optional Streamable HTTP transport with per-session bridge isolation, in-memory session metadata, Bearer token support, and HTTP configuration flags.
- Added Codecov coverage upload and a README coverage badge.

### Fixed

- Streamable HTTP sessions now start upstream Playwright MCP with isolated browser profiles for concurrent users.
- Generated CLI docs no longer trigger infinite rebuilds during `mkdocs serve`.
- Hardened Streamable HTTP authorization parsing, IPv6 endpoint matching, and internal error responses.

### Security

- Updated the Vitest/Vite development test stack to patched transitive `vite` and `esbuild` versions.

## [1.0.2] - 2026-05-23

### Changed

- Migrated npm publishing from `NPM_TOKEN` authentication to npm Trusted Publishing with GitHub Actions OIDC.

## [1.0.1] - 2026-05-23

### Fixed

- Removed the direct `push` trigger from the main quality `CI` workflow while keeping pull request and manual runs.

## [1.0.0] - 2026-05-23

### Changed

- Rebuilt the runtime as a stdio bridge over upstream `@playwright/mcp`.
- Replaced the native browser adapter, tool registry, capability model, artifact manager, origin policy, and custom browser tool implementations with upstream Playwright MCP forwarding.
- Docker now uses `mcr.microsoft.com/playwright/mcp:v0.0.75` as the runtime base.
- npm publishing is now CLI-focused; no supported programmatic server API is exported.
- Configuration now uses `PLAYWRIGHT_MCP_*` for upstream behavior and `CLOAK_PLAYWRIGHT_MCP_*` for Cloak-specific bridge toggles.
- Documentation now leads with npm and Docker usage and groups development, testing, and architecture under contributor documentation.
- The outer bridge supports stdio transport only; upstream HTTP/SSE transport is not proxied.
- Upstream Playwright MCP contracts are authoritative and may change when the pinned upstream version changes.

### Added

- Generated Playwright MCP config that injects the CloakBrowser executable path into `browser.launchOptions.executablePath`.
- MCP proxy that forwards upstream tool list and tool calls unchanged.
- Local read-only introspection tools: `cloakbrowser_binary_info` and `cloakbrowser_bridge_info`.
- Console message fallback patch promoted from the experiment into the bridge runtime.
- Bridge-focused unit tests for environment parsing, config generation, launch args, and local tools.
- Integration test that verifies forwarding through a fake upstream MCP child process.
- Docker smoke and upstream parity comparison script.

### Removed

- Old `CLOAKBROWSER_MCP_*` environment aliases.
- `browser_get_config` custom implementation, verify helpers, and capability-gated project extensions.
- Native `createServer`, `ToolRegistry`, `BrowserAdapter`, `MockBrowserAdapter`, `SessionManager`, and related public exports.
- Generated configuration documentation based on the removed native config schema.
- Public SEO setup guide and stale roadmap page from the published documentation.

[Unreleased]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.2.7...v1.3.0
[1.2.7]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.2.6...v1.2.7
[1.2.6]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.2.3...v1.2.5
[1.2.3]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/swimmwatch/cloakbrowser-mcp/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/swimmwatch/cloakbrowser-mcp/releases/tag/v1.0.0
