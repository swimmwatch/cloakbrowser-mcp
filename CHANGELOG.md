# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project will adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once releases begin.

## [Unreleased]

### Changed

- Rebuilt the runtime as a stdio bridge over upstream `@playwright/mcp`.
- Replaced the native browser adapter, tool registry, capability model, artifact manager, origin policy, and custom browser tool implementations with upstream Playwright MCP forwarding.
- Docker now uses `mcr.microsoft.com/playwright/mcp:v0.0.75` as the runtime base.
- npm publishing is now CLI-focused; no supported programmatic server API is exported.
- Configuration now uses `PLAYWRIGHT_MCP_*` for upstream behavior and `CLOAK_PLAYWRIGHT_MCP_*` for Cloak-specific bridge toggles.
- Documentation now leads with npm and Docker usage and groups development, testing, and architecture under contributor documentation.

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

### Known Limitations

- The outer bridge supports stdio transport only.
- Upstream HTTP/SSE transport is not proxied.
- Upstream Playwright MCP contracts are authoritative and may change when the pinned upstream version changes.

[Unreleased]: https://github.com/swimmwatch/cloakbrowser-mcp/commits/main
