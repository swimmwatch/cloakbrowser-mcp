---
description: Checkliste für Beiträge und Anleitung für Pull-Anfragen zur Entwicklung von CloakBrowser MCP.
icon: material/source-pull
tags:
  - Project Internals
---

# Mitwirken

Bevor du einen Pull-Request erstellst, führe bitte die lokalen Prüfungen durch und lies dir die Seite zur Bridge-Architektur durch.

```bash
npm install
npm run check
```

## Checkliste für Pull-Anfragen

- [ ] `npm run check` besteht den Test.
- [ ] Das neue Bridge-Verhalten wurde getestet.
- [ ] Die vorgelagerten Playwright-MCP-Schemas, Beschreibungen und Antworten bleiben unverändert.
- [ ] Für den Benutzer sichtbare Änderungen sind dokumentiert.
- [ ] `CHANGELOG.md` wurde hinsichtlich der für den Benutzer sichtbaren Änderungen aktualisiert.
- [ ] Sicherheitsrelevante Änderungen sind in der PR-Beschreibung vermerkt.

## Was man nicht tun sollte

- Fügen Sie den entfernten nativen Browser-Adapter, die Tool-Registrierung oder das Capability-Modell nicht erneut ein.
- Schreiben Sie keine Laufzeitprotokolle in `stdout`; stdio ist für MCP JSON-RPC reserviert.
- Fügen Sie keine Abhängigkeit hinzu, es sei denn, sie wird von der Laufzeitumgebung oder von Tests importiert.
- Schwächen Sie die Einstellungen für TypeScript, ESLint oder Prettier nicht ab, um eine Änderung durchzubringen.
- Committe `dist/`, `coverage/`, `artifacts/`, `site/`, `.venv-docs/` oder `node_modules/`.

## Sicherheitsprobleme

Melden Sie Sicherheitslücken über GitHub Security Advisories und nicht über öffentliche Issues. Siehe [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
