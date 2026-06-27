---
description: Von CloakBrowser MCP bereitgestellte Tool-Oberfläche.
icon: material/tools
tags:
  - Werkzeuge
  - Benutzerhandbuch
---

# Werkzeuge

`cloakbrowser-mcp` stellt upstream Playwright-MCP-Tools unverändert bereit. Toolnamen, Beschreibungen, Schemata, Annotationen und Antworten stammen aus `@playwright/mcp`.

## Upstream-Tools

Die standardmäßige upstream Browser-Tool-Oberfläche soll der fixierten Playwright-MCP-Abhängigkeit entsprechen. Dazu gehören zentrale Browser-Tools wie Navigation, Snapshot, Klicks, Texteingabe, Screenshots, Tabs, Konsolennachrichten, Netzwerkprüfung, Datei-Upload, Dialoge und unsichere Auswertungstools.

Als stabile upstream Referenz siehe den Playwright-MCP-`@playwright/mcp@0.0.76`-Capability-Test, der auf den exakten Paket-Commit fixiert ist: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/b301c372ec741289eff1cf6aab9d3bec553f31e2/tests/capabilities.spec.ts#L19-L77).

Dieses Projekt behandelt upstream Playwright MCP als maßgebliche Quelle und pflegt keine kopierte Schema-Referenz.

## Lokale Tools

### `cloakbrowser_binary_info`

Gibt strukturierte Informationen über das CloakBrowser-Paket, die aktuelle Plattform, das Cache-Verzeichnis, den erwarteten Binärpfad, den Installationsstatus und den resolved executable path zurück, den die Bridge verwendet.

### `cloakbrowser_bridge_info`

Gibt strukturierte Bridge-Metadaten zurück:

- MCP server Name und Version;
- Laufzeitmodus;
- upstream Playwright-MCP-Paket und Version;
- Anzahl der upstream Tools;
- Namen lokaler Cloak-specific Tools.

## Parität

CI baut das Docker-Image und führt `npm run bridge:compare` aus. Dieses Skript startet das offizielle Playwright-MCP-Image und das CloakBrowser-Bridge-Image parallel, vergleicht die upstream Toolliste und führt die standardmäßigen upstream Browser-Tools gegen dieselbe Fixture-Seite aus.

Verwende `--report`, um einen maschinenlesbaren JSON-Bericht zu schreiben:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI lädt diesen Bericht als Artifact für Docker-Builds und Release-Builds hoch.
