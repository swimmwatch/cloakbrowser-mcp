---
description: Brückenarchitektur für CloakBrowser MCP.
icon: material/graph
tags:
  - Project Internals
---

# Architektur

## Laufzeit

`cloakbrowser-mcp` ist ein externer MCP-Server, der stdio oder Streamable HTTP bereitstellen kann. Beim Start führt er folgende Schritte aus:

1. löst die CloakBrowser-Chromium-Binärdatei auf oder installiert sie;
2. schreibt eine temporäre Playwright-MCP-Konfigurationsdatei;
3. startet den Upstream-Prozess `@playwright/mcp` als untergeordneten Prozess über stdio;
4. stellt über den MCP-SDK-Client-Transport eine Verbindung zu diesem Kindprozess her;
5. stellt dem MCP-Client des Benutzers über den ausgewählten Transport einen äußeren MCP-Server zur Verfügung;
6. leitet die Upstream-Tool-Liste und die Tool-Aufrufe unverändert weiter;
7. hängt `cloakbrowser_binary_info` und `cloakbrowser_bridge_info` an.

## Warum dieses Design?

Das vorgelagerte Playwright-MCP-Projekt verfügt bereits über die Browser-Tool-Verträge und entwickelt sich rasch weiter. Das Brückenmodell sorgt dafür, dass dieses Projekt schlank bleibt, und vermeidet eine Duplizierung der Logik zur Browser-Automatisierung.

## Verwalteter CDP Besitz { #managed-cdp-ownership }

Managed CDP ist eine optionale zweite Steuereinheit für dieselbe Browsergeneration:

```text
MCP client -> outer bridge -> upstream Playwright MCP child -> Chromium
                    |                    |                    |-- Playwright pipe
                    |                    `-- generated config `-- internal loopback CDP
                    `-- external capability proxy <--------- CDP client
```

Die MCP-Sitzung besitzt das externe Port-Leasing, den Fähigkeitsproxy, upstream generiert
Konfiguration, austauschbares übergeordnetes Kind und aktuelle Chromium-Generation. Ein CDP
Der Client verbindet sich niemals direkt mit dem internen Loopback-Endpunkt. Bootstrap platziert ein
Einmal-Verwendungs-Browserseiten-Herausforderung durch MCP und verbraucht sie durch CDP vor dem
externe Fähigkeit ist veröffentlicht. Playwrights interner Remote-Debugging-Pipe bleibt
aktiv neben dem von der Bridge verwalteten TCP-Endpunkt.

Die externe Portmiete ist für die MCP-Sitzung stabil, während der Kindprozess,
Interner Endpunkt, Generationsnummer und Fähigkeit URL sind austauschbar. Browser
Verlust macht die aktuelle Fähigkeit ungültig und schließt deren vermittelte Sockets, tut dies jedoch nicht
starte ein Kind im Hintergrund. Der erste spätere `browser_*` MCP Aufruf gilt für die
Neustart-vor-Weiterleitung-Regel:

1. gleichzeitige Browseraufrufe teilen einen begrenzten Neustart;
2. Das alte Kind wird unerreichbar und wird entsorgt;
3. Ein Ersatzkind verwendet die gleiche Sitzungs-Konfiguration und einen neuen internen Port;
4. Eigentum und externe Bereitschaft werden vor der Veröffentlichung überprüft;
5. Wartende Browseraufrufe werden jeweils genau einmal an den bereiten Ersatz weitergeleitet.

Wenn die Bereitschaft fehlschlägt, erreicht kein wartender Browser-Aufruf ein übergeordnetes Kind, keine Fähigkeit
wird veröffentlicht, und ein späterer Browseraufruf kann einen neuen begrenzten Versuch starten. Browserzustand
wie zum Beispiel Registerkarten und der Speicher im Arbeitsspeicher werden beim Austausch nicht wiederhergestellt. Lokale Werkzeuge,
Werkzeugauflistung, Entdeckungslesungen und gewöhnliche CDP-Trennungen lösen keinen Neustart aus.

Das Aufräumen kehrt die Erreichbarkeit um: Zulassung stoppen, die Fähigkeit ungültig machen, Proxy schließen
Sockets, geben Sie das übergeordnete Kind und den Browser auf, schließen Sie den externen Listener, dann
Die Port-Lizenz freigeben. Dies verhindert, dass ein alter URL stillschweigend auf einen neuen Browser wechselt.

Die Befehle MCP und CDP können gleichzeitig ausgeführt werden. Die Brücke fügt kein Protokoll-übergreifendes hinzu
Transaktionen oder ableiten, welcher Anrufer eine Seite besitzt; Anrufer müssen zerstörerische oder koordinieren
konfliktierende Operationen.

## Docker

Das Docker-Image verwendet das festgelegte offizielle Playwright-MCP-Image als Basisimage. Die Bridge ist unter `/opt/cloakbrowser-mcp` installiert, während das vorgelagerte Playwright-MCP weiterhin unter `/app/cli.js` weiterhin verfügbar.

## Konfiguration

Die Brücke erstellt eine temporäre JSON-Konfiguration mit den Startoptionen für CloakBrowser. Die Upstream-Umgebungsvariablen `PLAYWRIGHT_MCP_*` werden weiterhin an das Upstream-Playwright-MCP weitergeleitet.

## Transport

Der Standardtransport ist stdio. Streamable HTTP wird explizit mit `--transport streamable-http` oder `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http` aktiviert.

Bei „stdio“ verwaltet ein äußerer Server einen untergeordneten Playwright-MCP-Prozess und behält das Standardprofilverhalten des übergeordneten Playwright-MCP bei. Bei „Streamable HTTP“ verfügt jede MCP-Sitzung über einen eigenen äußeren Server, einen eigenen Upstream-Kindprozess, eine generierte Konfiguration und einen Transportstatus im Arbeitsspeicher. HTTP-Sitzungen starten das Upstream-Playwright-MCP mit isolierten Browserprofilen, sodass gleichzeitige Benutzer nicht dasselbe persistente Chromium-Profil gemeinsam nutzen oder darum konkurrieren müssen.

Das Session-Backend speichert ausschließlich Metadaten. Das integrierte Backend ist `memory`; zukünftige Redis-, Postgres- oder SQLite-Adapter können Metadaten und Sperren koordinieren, sind jedoch nicht in der Lage, einen aktiven Upstream-Browserprozess wiederherzustellen, nachdem der zugehörige Serverprozess beendet wurde. Bei der horizontalen Skalierung sollten Sticky-Sessions verwendet werden, die anhand von `mcp-session-id` zugeordnet werden.

Die Bridge verwendet das MCP-SDK `StreamableHTTPServerTransport` für Streamable HTTP. Sie stellt weder den veralteten MCP-Endpunkt `SSEServerTransport` oder einen Legacy-Endpunkt `/sse` nicht zur Verfügung.
