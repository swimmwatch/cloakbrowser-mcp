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

Als stabile upstream Referenz siehe den Playwright-MCP-`{{ project.playwright_mcp_package_tag }}`-Capability-Test, der auf den exakten Paket-Commit fixiert ist: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/tests/capabilities.spec.ts#L19-L77).

Dieses Projekt behandelt upstream Playwright MCP als maßgebliche Quelle und pflegt keine kopierte Schema-Referenz.

Der Standardsatz umfasst 25 Upstream-Tools, einschließlich `browser_emulate_media`. `PLAYWRIGHT_MCP_CAPS=devtools`
übergibt die Fähigkeit `devtools` ohne bridge-eigene Option `--caps` an den
Kindprozess; die resultierenden Upstream-Tools und -Schemas werden unverändert
weitergeleitet, einschließlich `browser_start_recording` und
`browser_stop_recording`.

!!! warning "Aufzeichnungseinschränkung mit der öffentlichen CloakBrowser-v146-Binärdatei"
    Die Aufzeichnungswerkzeuge sind verfügbar, aber die von CloakBrowser 0.5.10
    verwendete öffentliche, schlüsselfreie Chromium-146-Binärdatei deaktiviert aus
    Stealth-Gründen absichtlich die Playwright-Verbindung zwischen Seite und Host.
    Dadurch kann `browser_stop_recording` unvollständigen Code zurückgeben: Die Navigation
    wird aufgezeichnet, erfolgreiche Eingaben und Klicks werden jedoch ausgelassen.
    Prüfen Sie erzeugte Aufzeichnungen vor der Wiederverwendung.

    Die explizit aktivierbare Kompatibilität wird in [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532) verfolgt.
    Die zugrunde liegende Entscheidung zur Verbindung wird in
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) und
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176) diskutiert.

### Dynamische WebMCP-Tools

Chromium unterstützt WebMCP ab Version 154. Ältere CloakBrowser-Builds ignorieren das feature flag; verwenden Sie einen kompatiblen Browser-Build oder `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`, wenn WebMCP erforderlich ist.

Wenn Chromium mit `--enable-features=WebMCP` gestartet wird, können Seiten `webmcp_*`-Tools deklarieren. Die Bridge leitet `notifications/tools/list_changed` weiter, leert den gesamten `tools/list`-Cache und der Client muss die Liste erneut abrufen. Bei Streamable HTTP erhält nur der offene Benachrichtigungsstream der zugehörigen Sitzung das Ereignis; auch ohne Stream ist das nächste `tools/list` aktuell. Name, Beschreibung, Schema, annotations und output sind nicht vertrauenswürdige Seitendaten. Die Bridge aktiviert WebMCP nicht automatisch; `PLAYWRIGHT_MCP_WEBMCP=false` deaktiviert die Erfassung.

## Lokale Tools

### `cloakbrowser_binary_info`

Gibt strukturierte Informationen über das CloakBrowser-Paket, die aktuelle Plattform, das Cache-Verzeichnis, den erwarteten Binärpfad, den Installationsstatus und den resolved executable path zurück, den die Bridge verwendet.

### `cloakbrowser_bridge_info`

Gibt strukturierte Bridge-Metadaten zurück:

Das additive `structuredContent.cdp`-Objekt meldet die verwaltete CDP der aufrufenden Sitzung
Bundesstaat:

```json
{ "enabled": false }
```

```json
{
  "enabled": true,
  "state": "ready",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": "http://127.0.0.1:9222/cdp/<capability>",
  "activeConnections": 0
}
```

```json
{
  "enabled": true,
  "state": "unavailable",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": null,
  "activeConnections": 0
}
```

`generation` steigt und `discoveryUrl` dreht sich nach dem Browserwechsel.
`activeConnections` zählt akzeptierte proxied WebSocket-Verbindungen, ohne sie offenzulegen
Client-Identitäten, Ziel-IDs oder Protokollinhalte. Behandeln Sie jede nicht-null Entdeckung URL
als Referenz.

Verwenden Sie die Entdeckung URL mit einem CDP-fähigen Client:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

Verwaltetes CDP ist nicht das Playwright Serverprotokoll. Playwright
`chromium.connect()` und die aktuelle Open WebUI `PLAYWRIGHT_WS_URL`-Integration erwarten
ein Playwright-Server-Endpunkt und sind mit diesem URL nicht kompatibel.

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
