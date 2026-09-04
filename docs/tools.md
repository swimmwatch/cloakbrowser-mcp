---
description: Tool surface exposed by CloakBrowser MCP.
icon: material/tools
tags:
  - Tools
  - User Guide
---

# Tools

`cloakbrowser-mcp` exposes upstream Playwright MCP tools unchanged. Tool names, descriptions, schemas, annotations, and responses come from `@playwright/mcp`.

## Upstream Tools

The default upstream browser tool surface is expected to match the pinned Playwright MCP dependency. It contains 24 tools, including navigation, snapshot, click, typing, screenshots, tabs, console messages, network inspection, file upload, dialogs, and unsafe evaluation tools.

For a stable upstream reference, see the Playwright MCP `{{ project.playwright_mcp_package_tag }}` capability test pinned to the exact package commit: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/4c1fb03bad3bae379b0ae0e3d81d2660de56bd91/tests/capabilities.spec.ts#L19-L77).

Set `PLAYWRIGHT_MCP_CAPS=devtools` to pass the upstream `devtools` capability to
the child process. The bridge has no `--caps` flag and forwards the resulting
upstream tools and schemas unchanged, including `browser_start_recording` and
`browser_stop_recording`.

!!! warning "Recording limitation with the public CloakBrowser v146 binary"
    The recording tools are available, but the public no-key Chromium 146
    binary used by CloakBrowser 0.5.10 intentionally disables Playwright's
    page-to-host binding for stealth. As a result, `browser_stop_recording` may
    return partial code: navigation is recorded while successful input and
    click actions are omitted. Review generated recordings before reuse.

    Opt-in compatibility is tracked in [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    The underlying binding decision is discussed in
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) and
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

This project treats upstream Playwright MCP as authoritative and does not maintain a copied schema reference.

## Local Tools

### `cloakbrowser_binary_info`

Returns structured information about the CloakBrowser package, current platform, cache directory, expected binary path, install status, and resolved executable path used by the bridge.

### `cloakbrowser_bridge_info`

Returns structured bridge metadata:

- MCP server name and version;
- runtime mode;
- upstream Playwright MCP package and version;
- upstream tool count;
- local Cloak-specific tool names.

The local tool surface remains limited to these two introspection tools.
`SessionSeats` and `getSessionSeats` are not exposed as an MCP tool because
CloakBrowser 0.5.10 does not export that API from its public entry point.

## Parity

CI builds the Docker image and runs `npm run bridge:compare`. That script starts the official Playwright MCP image and the CloakBrowser bridge image in parallel, compares the default 24-tool upstream surface and the `PLAYWRIGHT_MCP_CAPS=devtools` schemas, and exercises the default upstream browser tools against the same fixture page.

Use `--report` to write a machine-readable JSON parity report:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI uploads that report as an artifact for Docker builds and release builds.
