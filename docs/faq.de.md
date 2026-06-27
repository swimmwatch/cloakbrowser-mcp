---
description: Häufig gestellte Fragen zur Installation von CloakBrowser MCP, zur Verwendung von Docker, zur Playwright-MCP-Parität und zur Sicherheit.
icon: material/help-circle
tags:
  - User Guide
---

# Häufig gestellte Fragen

## Was ist CloakBrowser MCP?

CloakBrowser MCP ist ein [Model Context Protocol](https://modelcontextprotocol.io/)-Server für die Browser-Automatisierung über stdio oder Streamable HTTP. Er läuft upstream von [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) und verweist die Playwright-MCP-Browser-Startkonfiguration auf die [CloakBrowser](https://github.com/CloakHQ/CloakBrowser)-Chromium-Binärdatei.

## Inwiefern unterscheidet es sich vom Upstream-Playwright-MCP?

Der vorgelagerte Playwright-MCP-Server verwaltet die Schemata, Beschreibungen und Antworten der Browser-Tools. CloakBrowser MCP behält diese Tools unverändert bei und fügt lediglich zwei lokale Introspektions-Tools hinzu: `cloakbrowser_binary_info` und `cloakbrowser_bridge_info`.

## Soll ich es über npm oder Docker installieren?

Verwenden Sie npm, wenn Ihr MCP-Client bereits auf Ihrem Rechner läuft und Node.js 22.12 oder neuer verfügbar ist. Verwenden Sie Docker, wenn Sie ein reproduzierbares, auf Playwright MCP basierendes Image wünschen, bei dem der CloakBrowser-Cache bereits im Container vorbereitet ist.

## Welche MCP-Kunden können diese Funktion nutzen?

Jeder MCP-Client, der stdio- oder Streamable-HTTP-Server unterstützt, kann CloakBrowser MCP nutzen. Das Handbuch [Erste Schritte](getting-started.md) enthält stdio-JSON-Beispiele für Codex, Claude Desktop, Claude Code, Cursor, VS Code-/Cline-ähnliche Clients, Continue, Windsurf, Goose und Warp-ähnliche Konfigurationen.

## Unterstützt es dieselben Browser-Tools wie Playwright MCP?

Ja. Die Upstream-Playwright-MCP-Browser-Tools werden unverändert weitergeleitet. Im Rahmen der CI wird zudem ein Paritätsvergleich durchgeführt, sodass Änderungen an der Bridge mit dem offiziellen Verhalten von Playwright MCP abgeglichen werden können.

## Verbessert Docker die Sicherheit?

Docker bietet Ihnen eine besser reproduzierbare und isolierte Laufzeitumgebung, macht die Browser-Automatisierung jedoch nicht risikofrei. Behandeln Sie automatisiertes Surfen wie eine nicht vertrauenswürdige Ausführung: Vermeiden Sie die Weitergabe vertraulicher Daten an unbekannte Seiten, speichern Sie Artefakte und Screenshots in kontrollierten Verzeichnissen und lesen Sie den [Sicherheitsleitfaden](security.md) durch, bevor Sie den Server für andere Systeme freigeben.

## Werden bei diesem Projekt Analysetools oder Tracking-Funktionen eingesetzt?

Nein. Auf der Dokumentationsseite sind Analysefunktionen standardmäßig nicht aktiviert. Die Auffindbarkeit in Suchmaschinen wird über Standard-Metadaten, `robots.txt`, die Erstellung einer Sitemap, optionale Webmaster-Verifizierungs-Tags und optionale IndexNow-Benachrichtigungen gewährleistet.
