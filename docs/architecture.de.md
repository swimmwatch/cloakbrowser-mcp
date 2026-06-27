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

## Docker

Das Docker-Image verwendet das festgelegte offizielle Playwright-MCP-Image als Basisimage. Die Bridge ist unter `/opt/cloakbrowser-mcp` installiert, während das vorgelagerte Playwright-MCP weiterhin unter `/app/cli.js` weiterhin verfügbar.

## Konfiguration

Die Brücke erstellt eine temporäre JSON-Konfiguration mit den Startoptionen für CloakBrowser. Die Upstream-Umgebungsvariablen `PLAYWRIGHT_MCP_*` werden weiterhin an das Upstream-Playwright-MCP weitergeleitet.

## Transport

Der Standardtransport ist stdio. Streamable HTTP wird explizit mit `--transport streamable-http` oder `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http` aktiviert.

Bei „stdio“ verwaltet ein äußerer Server einen untergeordneten Playwright-MCP-Prozess und behält das Standardprofilverhalten des übergeordneten Playwright-MCP bei. Bei „Streamable HTTP“ verfügt jede MCP-Sitzung über einen eigenen äußeren Server, einen eigenen Upstream-Kindprozess, eine generierte Konfiguration und einen Transportstatus im Arbeitsspeicher. HTTP-Sitzungen starten das Upstream-Playwright-MCP mit isolierten Browserprofilen, sodass gleichzeitige Benutzer nicht dasselbe persistente Chromium-Profil gemeinsam nutzen oder darum konkurrieren müssen.

Das Session-Backend speichert ausschließlich Metadaten. Das integrierte Backend ist `memory`; zukünftige Redis-, Postgres- oder SQLite-Adapter können Metadaten und Sperren koordinieren, sind jedoch nicht in der Lage, einen aktiven Upstream-Browserprozess wiederherzustellen, nachdem der zugehörige Serverprozess beendet wurde. Bei der horizontalen Skalierung sollten Sticky-Sessions verwendet werden, die anhand von `mcp-session-id` zugeordnet werden.

Die Bridge verwendet das MCP-SDK `StreamableHTTPServerTransport` für Streamable HTTP. Sie stellt weder den veralteten MCP-Endpunkt `SSEServerTransport` oder einen Legacy-Endpunkt `/sse` nicht zur Verfügung.
