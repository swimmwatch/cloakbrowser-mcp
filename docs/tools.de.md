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

Als stabile Referenz für Playwright MCP `@playwright/mcp@0.0.83` dient der Fähigkeitstest am Commit dieses Pakets: [Standard-Tools und fähigkeitsabhängige Tools](https://github.com/microsoft/playwright-mcp/blob/f183dad4a52965583e3cc1d59b88cdc279e2e57d/tests/capabilities.spec.ts#L19-L74). Die installierte Abhängigkeit bestimmt die aktuelle Tool-Oberfläche.

Dieses Projekt behandelt upstream Playwright MCP als maßgebliche Quelle und pflegt keine kopierte Schema-Referenz.

Der Standardsatz umfasst 25 Upstream-Tools, einschließlich `browser_emulate_media`. `PLAYWRIGHT_MCP_CAPS=devtools`
übergibt die Fähigkeit `devtools` ohne bridge-eigene Option `--caps` an den
Kindprozess; die resultierenden Upstream-Tools und -Schemas werden unverändert
weitergeleitet, einschließlich `browser_start_recording` und
`browser_stop_recording`.

!!! warning "Aufzeichnungseinschränkung mit der öffentlichen CloakBrowser-v146-Binärdatei"
    Die Aufzeichnungswerkzeuge sind verfügbar, aber das öffentliche Chromium-146-Binärprogramm ohne Schlüssel deaktiviert aus Stealth-Gründen absichtlich die Playwright-Verbindung zwischen Seite und Host. Dadurch kann `browser_stop_recording` unvollständigen Code zurückgeben: Die Navigation wird aufgezeichnet, erfolgreiche Eingaben und Klicks werden jedoch ausgelassen. Prüfen Sie erzeugte Aufzeichnungen vor der Wiederverwendung.

    Die explizit aktivierbare Kompatibilität wird in [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532) verfolgt.
    Die zugrunde liegende Entscheidung zur Verbindung wird in
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) und
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176) diskutiert.

### Dynamische WebMCP-Tools

Die WebMCP-Unterstützung hängt vom gewählten Browser-Build und den aktivierten Funktionen ab. Das installierte Playwright MCP erwartet `document.modelContext` oder `navigator.modelContext` mit einer Methode `getTools()`. Verwenden Sie einen kompatiblen CloakBrowser-Build oder `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`, wenn WebMCP erforderlich ist.

[Die WebMCP-Dokumentation von Chrome](https://developer.chrome.com/docs/ai/webmcp) beschreibt einen Origin Trial ab Chrome 149, ein Flag für lokale Tests und Einschränkungen im Headless-Modus. Eine Chromium-Versionsnummer allein garantiert keine Kompatibilität mit der von Playwright MCP erwarteten API.

Wenn Chromium mit `--enable-features=WebMCP` gestartet wird, kann Playwright MCP während einer geöffneten Seite deren Tools mit Namen wie `webmcp_*` hinzufügen. Diese Tools sind dynamisch: Die Bridge meldet Unterstützung für `tools.listChanged`, invalidiert den gesamten Cache der paginierten Tool-Liste, sobald Upstream `notifications/tools/list_changed` sendet, und leitet die Benachrichtigung an den zugehörigen MCP-Client weiter. Clients sollten diese Benachrichtigung empfangen und `tools/list` erneut aufrufen. Ein Streamable-HTTP-Client erhält sie nur bei geöffnetem Benachrichtigungsstream seiner Sitzung; auch ohne geöffneten Stream liefert der nächste Aufruf von `tools/list` eine aktuelle Liste.

Dynamische Tools gehören ausschließlich zu der MCP-Sitzung und der aktuellen verwalteten CDP-Browsergeneration, die sie entdeckt haben. Namen, Beschreibungen, Schemas, Annotationen und Ausgaben sind nicht vertrauenswürdige Seiteninhalte und werden von der Bridge unverändert weitergeleitet. Prüfen Sie diese Inhalte vor einem Aufruf. Mit `PLAYWRIGHT_MCP_WEBMCP=false` deaktivieren Sie die Erfassung. Die Bridge aktiviert Chromium WebMCP niemals automatisch.

## Lokale Tools

### `cloakbrowser_binary_info`

Gibt strukturierte Informationen über das CloakBrowser-Paket, die aktuelle Plattform, das Cache-Verzeichnis, den erwarteten Binärpfad, den Installationsstatus und den resolved executable path zurück, den die Bridge verwendet.

### `cloakbrowser_bridge_info`

Gibt strukturierte Bridge-Metadaten zurück:

- Name und Version des MCP-Servers;
- Laufzeitmodus;
- Upstream-Playwright-MCP-Paket und Version;
- Anzahl der Upstream-Tools;
- Namen lokaler Cloak-spezifischer Tools.

Das zusätzliche Objekt `structuredContent.cdp` meldet den Zustand des verwalteten CDP für die aufrufende Sitzung:

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

Nach dem Browserwechsel steigt `generation`, und `discoveryUrl` wird ersetzt.
`activeConnections` zählt akzeptierte WebSocket-Verbindungen über den Proxy, ohne Client-Identitäten, Ziel-IDs oder Protokollinhalte offenzulegen. Behandeln Sie jede von null verschiedene Discovery-URL als Zugangsnachweis.

Verwenden Sie die Discovery-URL mit einem CDP-fähigen Client:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

Verwaltetes CDP ist nicht das Playwright-Server-Protokoll. Playwrights `chromium.connect()` und die aktuelle Open-WebUI-Integration `PLAYWRIGHT_WS_URL` erwarten einen Playwright-Server-Endpunkt und sind mit dieser URL nicht kompatibel.

Mit dem festgelegten Playwright-Client wurde verifiziert, dass `browser.close()` auf einem von `connectOverCDP()` zurückgegebenen Browser nur diesen Client trennt und Chromium sowie die aktuelle Generation bereit bleiben. Diese Beobachtung gilt für diesen Client und ist keine Garantie für andere CDP-Bibliotheken. Das direkte Senden des CDP-Befehls `Browser.close` ist destruktiv: Es beendet die gemeinsam genutzte Chromium-Generation, invalidiert den Zugangsnachweis und betrifft MCP-Aufrufer. Koordinieren Sie MCP- und CDP-Operationen, da die Bridge konkurrierende Navigationen, Seitenschließungen, Eingaben oder Speicheränderungen nicht serialisiert.

Die lokale Tool-Oberfläche bleibt auf diese beiden Diagnose-Tools beschränkt. `SessionSeats` und `getSessionSeats` werden nicht als MCP-Tool bereitgestellt, weil der unterstützte öffentliche Einstiegspunkt von CloakBrowser diese API nicht exportiert.

## Parität

CI baut das Docker-Image und führt `npm run bridge:compare` aus. Dieses Skript startet das offizielle Playwright-MCP-Image und das CloakBrowser-Bridge-Image parallel, vergleicht die upstream Toolliste und führt die standardmäßigen upstream Browser-Tools gegen dieselbe Fixture-Seite aus.

Verwende `--report`, um einen maschinenlesbaren JSON-Bericht zu schreiben:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI lädt diesen Bericht als Artifact für Docker-Builds und Release-Builds hoch.
