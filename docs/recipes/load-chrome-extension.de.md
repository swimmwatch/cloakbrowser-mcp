---
title: "Chrome-Erweiterung laden"
description: Laden Sie eine entpackte Chrome-Erweiterung mit einem persistenten Profil in CloakBrowser MCP.
icon: material/puzzle
tags:
  - User Guide
---

# Chrome-Erweiterung laden

Chrome-Erweiterungen benötigen ein entpacktes Verzeichnis und ein persistentes Profil.

Dieses Rezept verwendet den Start entpackter Erweiterungen von CloakBrowser. Der Verbindungsmodus über die separat installierte offizielle Playwright Extension verwendet `PLAYWRIGHT_MCP_EXTENSION=true`, ein process-level `PLAYWRIGHT_MCP_EXTENSION_TOKEN` und ein eigenes persistent profile. Kombinieren Sie die beiden Mechanismen nicht.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Verwenden Sie ein JSON array für mehrere paths, Kommas oder Windows drive-letter paths.

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Starten Sie den Server nach Änderungen an Erweiterungsdateien oder Pfaden neu.

## Prüfen

Bitten Sie den MCP-Client, eine Seite zu öffnen, auf der die Erweiterung aktiv sein soll, und prüfen Sie ihr Verhalten oder erstellen Sie einen Screenshot. Mit `cloakbrowser_bridge_info` können Sie auch die erwartete Paketversion der Bridge bestätigen.

## Verwandt

- [Konfiguration](../configuration.md#chrome-extensions)
- [Docker](../docker.md#chrome-extensions)
- [Persistentes Login-Profil](persistent-login-profile.md)
