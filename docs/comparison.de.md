---
title: "@playwright/mcp vs cloakbrowser-mcp"
description: Vergleicht upstream Playwright MCP und CloakBrowser MCP für Tool-Parität, CloakBrowser-Ausführung, Paketierung, Streamable HTTP, Profile, Erweiterungen, regionale QA und humanisierte Eingabe.
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp vs cloakbrowser-mcp

Das ursprüngliche `@playwright/mcp` ist der maßgebliche Server für Playwright-MCP-Browsertools. `cloakbrowser-mcp` richtet sich an Teams, die dieselben Tools mit CloakBrowser Chromium und paketierten Bereitstellungsabläufen nutzen wollen.

## Funktionsvergleich

| Funktion | `@playwright/mcp` | `cloakbrowser-mcp` |
| --- | --- | --- |
| Unveränderte Upstream-Tools | Definiert die maßgeblichen Schemas, Beschreibungen und Antworten der Browsertools. | Leitet Upstream-Browsertools unverändert weiter und prüft ihre Übereinstimmung in CI. |
| CloakBrowser-Binärprogramm | Verwendet die von Upstream Playwright MCP gewählte Browserlaufzeit. | Generiert eine Upstream-Konfiguration mit CloakBrowser Chromium als ausführbarem Programm. |
| npm-Distribution | Wird als ursprüngliches Playwright-MCP-Paket veröffentlicht. | Wird als `cloakbrowser-mcp` für `npx` und stdio-Konfigurationen von MCP-Clients veröffentlicht. |
| Docker-Image | Stellt das offizielle Playwright-MCP-Image bereit. | Baut auf dem offiziellen Playwright-MCP-Image auf und bereitet CloakBrowser-Laufzeitvorgaben vor. |
| Streamable HTTP | Folgt dem Transportverhalten des Upstreams. | Bündelt stdio und Streamable HTTP mit Zustand, Bereitschaft, Authentifizierung, HTTPS und Sitzungsmetadatenoptionen. |
| Persistente Profile | Nutzt vom Upstream unterstützte Browserzustandsoptionen. | Validiert `PLAYWRIGHT_MCP_USER_DATA_DIR` und sperrt Profile bei der Konfigurationserzeugung. |
| Erweiterungspfade | Werden bei entsprechender Unterstützung über die Browserlaufzeit konfiguriert. | Lädt validierte Chrome-Erweiterungsverzeichnisse und setzt persistente Profile voraus. |
| Kontextvalidierung | Hängt von der Upstream-Konfigurationsstruktur ab. | Validiert unterstützte Kontextoptionen vor dem Schreiben der Playwright-MCP-Konfiguration. |
| Regionale QA mit GeoIP | Proxy-Routing bleibt Aufgabe des Upstreams. | Kann CloakBrowser-Zeitzone, Sprache und Locale-Fingerprint-Flags an den konfigurierten Proxy-Standort anpassen. |
| Humanisierte Interaktionen | Verwendet das Standardinteraktionsverhalten von Playwright MCP. | Kann unterstützte Seiteninteraktionen über das menschliche Eingabeverhalten von CloakBrowser ausführen. |

## Wann das ursprüngliche Playwright MCP wählen

- Sie das kleinste Playwright-MCP-Setup wollen;
- Sie CloakBrowser Chromium nicht benötigen;
- Sie dem upstream Packaging von Playwright MCP direkt folgen wollen.

## Wann CloakBrowser MCP wählen

- Playwright-MCP-Tools mit CloakBrowser Chromium laufen sollen;
- Sie dokumentierte Pfade für npm, Docker oder Streamable HTTP wollen;
- Sie persistente Profile, Erweiterungen, Kontextvalidierung, regionale QA oder humanisierte Eingabe benötigen.

## Nächste Schritte

- [Erste Schritte](getting-started.md)
- [Rezepte](recipes/index.md)
- [Werkzeuge](tools.md)
