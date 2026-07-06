---
title: "Chrome-Erweiterung laden"
description: Laden Sie eine entpackte Chrome-Erweiterung mit einem persistenten Profil in CloakBrowser MCP.
icon: material/puzzle
tags:
  - User Guide
---

# Chrome-Erweiterung laden

Chrome-Erweiterungen benötigen ein entpacktes Verzeichnis und ein persistentes Profil.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Verwenden Sie ein JSON array für mehrere paths, Kommas oder Windows drive-letter paths.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Starten Sie den Server nach Änderungen an Erweiterungsdateien oder Pfaden neu.

## Prüfen

Use the MCP client to open a page where the extension should be active, then inspect behavior or capture a screenshot.

## Verwandt

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Persistentes Login-Profil](persistent-login-profile.md)
