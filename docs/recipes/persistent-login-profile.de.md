---
title: "Persistentes Login-Profil"
description: Verwenden Sie CloakBrowser cookies, local storage, Cache und Erweiterungszustand mit einem persistenten Profilverzeichnis erneut.
icon: material/account-key
tags:
  - User Guide
---

# Persistentes Login-Profil

Ein persistentes Profil behält den Login-Zustand zwischen Browsersitzungen.

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

Konfigurieren Sie den MCP-Client mit demselben Befehl. Teilen Sie ein Profilverzeichnis nicht zwischen zwei aktiven Servern.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Verwenden Sie Containerpfade in Umgebungsvariablen; der Hostpfad steht nur im volume mount.

## Prüfen

1. Sign in once.
2. Restart with the same PLAYWRIGHT_MCP_USER_DATA_DIR.
3. Confirm the session remains active.

## Verwandt

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Chrome-Erweiterung laden](load-chrome-extension.md)
