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
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Verwenden Sie Containerpfade in Umgebungsvariablen; der Hostpfad steht nur im volume mount.

## Prüfen

1. Bitten Sie den MCP-Client, eine Anmeldeseite zu öffnen, und melden Sie sich an.
2. Stoppen Sie den Server ordnungsgemäß.
3. Starten Sie ihn mit demselben `PLAYWRIGHT_MCP_USER_DATA_DIR` erneut.
4. Lassen Sie den Client die Website erneut besuchen und prüfen Sie, ob die Anmeldung erhalten bleibt.

## Verwandt

- [Konfiguration](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#persistent-profiles)
- [Chrome-Erweiterung laden](load-chrome-extension.md)

## CloakBrowser 0.6.0

Bei aktiviertem CloakBrowser-Stealth behält ein ausdrücklich konfiguriertes dauerhaftes Profil seinen Fingerprint-Seed in `.cloakbrowser-seed`. Beim ersten Start nach dem Update wird ein Seed zugewiesen, falls die Datei fehlt. Ein explizites `--fingerprint`, einschließlich `--fingerprint=off`, hat Vorrang und lässt die Datei unverändert. Bei deaktiviertem Stealth wird die Datei nicht verändert. Beschädigte Dateien werden mit einer Warnung neu erzeugt; Zugriffsfehler verhindern den Start.
