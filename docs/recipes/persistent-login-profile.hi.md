---
title: "स्थायी लॉगिन प्रोफ़ाइल"
description: Persistent profile directory के साथ CloakBrowser cookies, local storage, cache और extension state को reuse करें।
icon: material/account-key
tags:
  - User Guide
---

# स्थायी लॉगिन प्रोफ़ाइल

Persistent profile browser sessions के बीच login state बचाता है।

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

MCP client को उसी command से configure करें। एक profile directory को दो active servers में share न करें।

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Environment variables में container paths उपयोग करें; host path केवल volume mount में रहता है।

## सत्यापन

1. Sign in once.
2. Restart with the same PLAYWRIGHT_MCP_USER_DATA_DIR.
3. Confirm the session remains active.

## संबंधित

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Chrome एक्सटेंशन लोड करें](load-chrome-extension.md)
