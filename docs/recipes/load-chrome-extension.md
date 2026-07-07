---
title: Load Chrome Extension
description: Load an unpacked Chrome extension into CloakBrowser MCP with a persistent profile.
icon: material/puzzle
tags:
  - User Guide
---

# Load Chrome Extension

Chrome extensions need an unpacked extension directory and a persistent profile. Configure both before the browser starts.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Use a JSON array when paths contain commas, when loading multiple extensions, or when using Windows drive-letter paths.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Restart the server after changing extension files or extension paths.

## Verify

Ask the MCP client to open a page where the extension should be active, then inspect the page behavior or capture a screenshot. You can also call `cloakbrowser_bridge_info` to confirm the bridge is running with the expected package version.

## Related

- [Configuration](../configuration.md#chrome-extensions)
- [Docker](../docker.md#chrome-extensions)
- [Persistent Login Profile](persistent-login-profile.md)
