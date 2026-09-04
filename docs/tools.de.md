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

Als stabile upstream Referenz siehe den Playwright-MCP-`{{ project.playwright_mcp_package_tag }}`-Capability-Test, der auf den exakten Paket-Commit fixiert ist: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/4c1fb03bad3bae379b0ae0e3d81d2660de56bd91/tests/capabilities.spec.ts#L19-L77).

Dieses Projekt behandelt upstream Playwright MCP als maßgebliche Quelle und pflegt keine kopierte Schema-Referenz.

Der Standardsatz umfasst 24 Upstream-Tools. `PLAYWRIGHT_MCP_CAPS=devtools`
übergibt die Fähigkeit `devtools` ohne bridge-eigene Option `--caps` an den
Kindprozess; die resultierenden Upstream-Tools und -Schemas werden unverändert
weitergeleitet, einschließlich `browser_start_recording` und
`browser_stop_recording`.

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

Die lokale Tool-Oberfläche bleibt auf diese beiden Diagnose-Tools beschränkt.
`SessionSeats` und `getSessionSeats` werden nicht als MCP-Tool bereitgestellt,
weil CloakBrowser 0.5.10 diese API nicht über seinen öffentlichen Einstiegspunkt
exportiert.

## Parität

CI baut das Docker-Image und führt `npm run bridge:compare` aus. Dieses Skript startet das offizielle Playwright-MCP-Image und das CloakBrowser-Bridge-Image parallel, vergleicht die upstream Toolliste und führt die standardmäßigen upstream Browser-Tools gegen dieselbe Fixture-Seite aus.

Verwende `--report`, um einen maschinenlesbaren JSON-Bericht zu schreiben:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI lädt diesen Bericht als Artifact für Docker-Builds und Release-Builds hoch.
