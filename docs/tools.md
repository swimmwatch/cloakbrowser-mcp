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

The default upstream browser tool surface is expected to match the pinned Playwright MCP dependency. This includes the core browser tools such as navigation, snapshot, click, typing, screenshots, tabs, console messages, network inspection, file upload, dialogs, and unsafe evaluation tools.

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

## Parity

CI builds the Docker image and runs `npm run bridge:compare`. That script starts the official Playwright MCP image and the CloakBrowser bridge image in parallel, compares the upstream tool list, and exercises the default upstream browser tools against the same fixture page.

Use `--report` to write a machine-readable JSON parity report:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI uploads that report as an artifact for Docker builds and release builds.
