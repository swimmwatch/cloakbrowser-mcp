---
title: Persistent Login Profile
description: Reuse CloakBrowser cookies, local storage, cache, and extension state by running CloakBrowser MCP with a persistent profile directory.
icon: material/account-key
tags:
  - User Guide
---

# Persistent Login Profile

Use a persistent profile when an MCP client should keep cookies, local storage, cache, or extension state between browser sessions.

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

Point your MCP client at the same stdio command. Keep one active server per profile directory; the bridge rejects duplicate active use to reduce Chromium profile corruption risk.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Use container paths in environment variables. The host path is only used in the `-v` mount.

## Verify

1. Ask the MCP client to open a login page and sign in.
2. Stop the server cleanly.
3. Start it again with the same `PLAYWRIGHT_MCP_USER_DATA_DIR`.
4. Ask the client to revisit the site and confirm the login state is still present.

## Related

- [Configuration](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#persistent-profiles)
- [Load Chrome Extension](load-chrome-extension.md)
