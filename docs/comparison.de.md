---
title: "@playwright/mcp vs cloakbrowser-mcp"
description: Vergleicht upstream Playwright MCP und CloakBrowser MCP für Tool-Parität, CloakBrowser-Ausführung, Paketierung, Streamable HTTP, Profile, Erweiterungen, regionale QA und humanisierte Eingabe.
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp vs cloakbrowser-mcp

Upstream @playwright/mcp ist der kanonische Server für Playwright-MCP-Browsertools. cloakbrowser-mcp hält diese Tool-Oberfläche unverändert, führt sie aber mit CloakBrowser Chromium und paketierten Deployment-Pfaden aus.

## Funktion

| Funktion | @playwright/mcp | cloakbrowser-mcp |
| --- | --- | --- |
| Upstream tools | Canonical browser tool surface. | Forwarded unchanged with parity checks. |
| CloakBrowser Chromium | Uses upstream selected browser runtime. | Runs upstream tools with CloakBrowser Chromium. |
| npm / Docker | Use upstream package and image. | Adds package and image paths for CloakBrowser deployment. |
| Streamable HTTP | Follows upstream transport behavior. | Adds packaged health, readiness, auth, HTTPS, and session metadata options. |
| Profiles / extensions | Use upstream browser state options. | Adds validated persistent profiles and extension paths. |
| Regional QA / humanized input | Standard Playwright MCP behavior. | Adds GeoIP helpers and optional humanized interactions. |

## Wählen Sie upstream, wenn

- Sie das kleinste Playwright-MCP-Setup wollen;
- Sie CloakBrowser Chromium nicht benötigen;
- Sie dem upstream Packaging von Playwright MCP direkt folgen wollen.

## Wählen Sie CloakBrowser MCP, wenn

- Playwright-MCP-Tools mit CloakBrowser Chromium laufen sollen;
- Sie dokumentierte Pfade für npm, Docker oder Streamable HTTP wollen;
- Sie persistente Profile, Erweiterungen, Kontextvalidierung, regionale QA oder humanisierte Eingabe benötigen.

## Nächste Schritte

- [Getting Started](getting-started.md)
- [Recipes](recipes/index.md)
- [Tools](tools.md)
