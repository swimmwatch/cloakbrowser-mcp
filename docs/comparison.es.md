---
title: "@playwright/mcp vs cloakbrowser-mcp"
description: Compara Playwright MCP upstream con CloakBrowser MCP para paridad de herramientas, ejecución de CloakBrowser, empaquetado, Streamable HTTP, perfiles, extensiones, QA regional y entrada humanizada.
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp vs cloakbrowser-mcp

El paquete original `@playwright/mcp` es el servidor de referencia de herramientas de navegador de Playwright MCP. `cloakbrowser-mcp` está dirigido a equipos que necesitan esas mismas herramientas con Chromium de CloakBrowser y formas de despliegue empaquetadas.

## Comparación de funciones

| Función | `@playwright/mcp` | `cloakbrowser-mcp` |
| --- | --- | --- |
| Herramientas originales sin cambios | Define los esquemas, descripciones y respuestas originales de las herramientas de navegador. | Reenvía las herramientas originales sin cambios y verifica su equivalencia en CI. |
| Binario CloakBrowser | Usa el navegador seleccionado por Playwright MCP original. | Genera la configuración upstream con Chromium de CloakBrowser como ejecutable. |
| Distribución npm | Se publica como paquete original de Playwright MCP. | Se publica como `cloakbrowser-mcp` para `npx` y configuraciones stdio de clientes MCP. |
| Imagen Docker | Proporciona la imagen oficial de Playwright MCP. | Se basa en la imagen oficial de Playwright MCP y prepara los valores predeterminados del entorno CloakBrowser. |
| Streamable HTTP | Sigue el comportamiento de transporte del proyecto original. | Incluye stdio y Streamable HTTP con salud, disponibilidad, autenticación, HTTPS y opciones de metadatos de sesión. |
| Perfiles persistentes | Usa las opciones de estado de navegador compatibles con upstream. | Valida `PLAYWRIGHT_MCP_USER_DATA_DIR` y bloquea el perfil al generar la configuración. |
| Rutas de extensiones | Se configuran mediante el navegador cuando este lo admite. | Carga directorios de extensiones Chrome validados y exige un perfil persistente. |
| Validación del contexto | Depende de la estructura de configuración upstream. | Valida las opciones de contexto compatibles antes de escribir la configuración de Playwright MCP. |
| QA regional con GeoIP | La responsabilidad del enrutamiento proxy sigue siendo de upstream. | Puede alinear las señales de zona horaria, idioma y configuración regional de CloakBrowser con la ubicación del proxy configurado. |
| Interacciones humanizadas | Usa el comportamiento estándar de interacción de Playwright MCP. | Puede dirigir las interacciones compatibles a través de la entrada humanizada de CloakBrowser. |

## Cuándo elegir Playwright MCP original

- quieres la instalación más pequeña de Playwright MCP;
- no necesitas CloakBrowser Chromium;
- prefieres seguir directamente el empaquetado upstream de Playwright MCP.

## Cuándo elegir CloakBrowser MCP

- las herramientas de Playwright MCP deben ejecutarse con CloakBrowser Chromium;
- quieres rutas documentadas para npm, Docker o Streamable HTTP;
- necesitas perfiles persistentes, extensiones, validación de contexto, QA regional o entrada humanizada.

## Siguientes pasos

- [Primeros pasos](getting-started.md)
- [Recetas](recipes/index.md)
- [Herramientas](tools.md)
