---
description: Einstiegspunkt für Mitwirkende bei CloakBrowser MCP.
icon: material/source-branch
tags:
  - Project Internals
---

# Leitfaden für Mitwirkende

Die Benutzerdokumentation konzentriert sich bewusst auf die Installation und Nutzung des MCP-Servers. Das Material für Entwickler ist hier zusammengefasst.

## Abschnitte

- [Entwicklung](development.md) für die lokale Einrichtung und die Paketstruktur.
- [Testen](testing.md) für Unit-Tests, Integrationstests, Docker, npm-Pakete und Paritätsprüfungen.
- [Architektur](architecture.md) für das Design der Bridge-Laufzeitumgebung.
- [Veröffentlichung](release.md) für Repository-Einstellungen und Veröffentlichungs-Workflows.
- [Mitwirken](contributing.md) zum Projekt-Workflow.

## Erforderliche lokale Überprüfung

```bash
npm run check
```

Führen Sie vor dem Commit die vollständige Überprüfung durch. Die Docker-Parity-Prüfung ist ressourcenintensiver und kann wie folgt ausgeführt werden:

```bash
npm run docker:build
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Metadaten- und Produktionsabhängigkeitsprüfungen können direkt mit folgendem Befehl ausgeführt werden:

```bash
npm run server:validate
npm run audit:prod
```
