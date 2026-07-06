---
title: "@playwright/mcp vs cloakbrowser-mcp"
description: Compara Playwright MCP upstream con CloakBrowser MCP para paridad de herramientas, ejecución de CloakBrowser, empaquetado, Streamable HTTP, perfiles, extensiones, QA regional y entrada humanizada.
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp vs cloakbrowser-mcp

Upstream @playwright/mcp es el servidor canónico de herramientas de navegador de Playwright MCP. cloakbrowser-mcp mantiene esa superficie sin cambios, pero la ejecuta con CloakBrowser Chromium y flujos de despliegue empaquetados.

## Función

| Función | @playwright/mcp | cloakbrowser-mcp |
| --- | --- | --- |
| Upstream tools | Canonical browser tool surface. | Forwarded unchanged with parity checks. |
| CloakBrowser Chromium | Uses upstream selected browser runtime. | Runs upstream tools with CloakBrowser Chromium. |
| npm / Docker | Use upstream package and image. | Adds package and image paths for CloakBrowser deployment. |
| Streamable HTTP | Follows upstream transport behavior. | Adds packaged health, readiness, auth, HTTPS, and session metadata options. |
| Profiles / extensions | Use upstream browser state options. | Adds validated persistent profiles and extension paths. |
| Regional QA / humanized input | Standard Playwright MCP behavior. | Adds GeoIP helpers and optional humanized interactions. |

## Elige upstream cuando

- quieres la instalación más pequeña de Playwright MCP;
- no necesitas CloakBrowser Chromium;
- prefieres seguir directamente el empaquetado upstream de Playwright MCP.

## Elige CloakBrowser MCP cuando

- las herramientas de Playwright MCP deben ejecutarse con CloakBrowser Chromium;
- quieres rutas documentadas para npm, Docker o Streamable HTTP;
- necesitas perfiles persistentes, extensiones, validación de contexto, QA regional o entrada humanizada.

## Siguientes pasos

- [Getting Started](getting-started.md)
- [Recipes](recipes/index.md)
- [Tools](tools.md)
