---
description: Teststrategie für CloakBrowser MCP mit Unit-Tests, Fake-Upstream-Integrationstests, Docker-Smoke-Tests und Playwright-MCP-Paritätsprüfungen.
icon: material/test-tube
tags:
  - Tests
  - Projektinternes
---

# Tests

## Unit-Tests

```bash
npm run test:unit
```

Unit-Tests decken das Parsen der Umgebung, die Bridge-Konfigurationserzeugung, die Verarbeitung von Startargumenten und lokale Cloak-Introspection-Tools ab.

## Integrationstests

```bash
npm run test:integration
```

Integrationstests verwenden einen gefälschten upstream MCP-Kindprozess und prüfen, dass die Bridge lokale Tools zusammenführt und upstream-Aufrufe unverändert weiterleitet.

CI führt Unit-, Integrations- und paketierte CLI-E2E-Tests auf Node.js 22 und 24-26 für Linux x64, Linux arm64, macOS arm64, macOS x64 und Windows x64 aus.

## Paketverifizierung

```bash
npm run package:verify
```

Dies baut das Paket, führt `npm pack` aus, prüft die Tarball-Dateiliste, installiert den Tarball in ein temporäres Projekt und verifiziert CLI `--version` und `--help`.

Die Paketverifizierung validiert außerdem `server.json` gegen das veröffentlichte MCP-Server-Schema.

## Docker-Smoke-Test

```bash
npm run docker:build
npm run docker:smoke
```

Der Smoke-Test prüft, dass das gebaute Image startet und CLI-Hilfe ausgibt. CI führt Smoke-Tests für Docker-Images auf `linux/amd64` und `linux/arm64` aus.

## Upstream-Parität

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Das Paritätsskript startet das offizielle Playwright-MCP-Docker-Image und das CloakBrowser-Bridge-Image, vergleicht upstream-Toolnamen, übt die Standard-Browser-Tooloberfläche auf derselben Fixture-Seite aus und prüft lokale Cloak-Introspection-Tools.

CI lädt den JSON-Paritätsbericht als Artifact für Docker-Build-Jobs und Release-Jobs hoch. Browser-Parität läuft derzeit auf `linux/amd64`; arm64-Docker-Jobs verwenden Smoke-Tests und Schwachstellenprüfungen.

## Sicherheitsprüfungen

```bash
npm run audit:prod
npm run server:validate
```

CI führt außerdem CodeQL, Dependency Review, OpenSSF Scorecard, zizmor und Trivy aus. Diese Werkzeuge sind für öffentliche Repositorys kostenlos und erfordern keine externen Konten.
