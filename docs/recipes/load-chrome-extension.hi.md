---
title: "Chrome एक्सटेंशन लोड करें"
description: Persistent profile के साथ unpacked Chrome extension को CloakBrowser MCP में load करें।
icon: material/puzzle
tags:
  - User Guide
---

# Chrome एक्सटेंशन लोड करें

Chrome extensions के लिए unpacked directory और persistent profile चाहिए।

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Multiple paths, commas या Windows drive-letter paths के लिए JSON array उपयोग करें।

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Extension files या paths बदलने के बाद server restart करें।

## सत्यापन

Use the MCP client to open a page where the extension should be active, then inspect behavior or capture a screenshot.

## संबंधित

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [स्थायी लॉगिन प्रोफ़ाइल](persistent-login-profile.md)
