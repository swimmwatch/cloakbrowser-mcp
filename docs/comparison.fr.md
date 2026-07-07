---
title: "@playwright/mcp vs cloakbrowser-mcp"
description: Compare Playwright MCP amont et CloakBrowser MCP pour la parité des outils, l’exécution CloakBrowser, le packaging, Streamable HTTP, les profils, extensions, QA régionale et saisie humanisée.
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp vs cloakbrowser-mcp

Le @playwright/mcp amont est le serveur canonique des outils navigateur Playwright MCP. cloakbrowser-mcp garde cette surface inchangée, mais l’exécute avec CloakBrowser Chromium et des chemins de déploiement empaquetés.

## Fonction

| Fonction | @playwright/mcp | cloakbrowser-mcp |
| --- | --- | --- |
| Upstream tools | Canonical browser tool surface. | Forwarded unchanged with parity checks. |
| CloakBrowser Chromium | Uses upstream selected browser runtime. | Runs upstream tools with CloakBrowser Chromium. |
| npm / Docker | Use upstream package and image. | Adds package and image paths for CloakBrowser deployment. |
| Streamable HTTP | Follows upstream transport behavior. | Adds packaged health, readiness, auth, HTTPS, and session metadata options. |
| Profiles / extensions | Use upstream browser state options. | Adds validated persistent profiles and extension paths. |
| Regional QA / humanized input | Standard Playwright MCP behavior. | Adds GeoIP helpers and optional humanized interactions. |

## Choisissez l’amont si

- vous voulez l’installation Playwright MCP la plus petite ;
- vous n’avez pas besoin de CloakBrowser Chromium ;
- vous préférez suivre directement le packaging amont de Playwright MCP.

## Choisissez CloakBrowser MCP si

- les outils Playwright MCP doivent tourner avec CloakBrowser Chromium ;
- vous voulez des chemins documentés pour npm, Docker ou Streamable HTTP ;
- vous avez besoin de profils persistants, extensions, validation de contexte, QA régionale ou saisie humanisée.

## Étapes suivantes

- [Getting Started](getting-started.md)
- [Recipes](recipes/index.md)
- [Tools](tools.md)
