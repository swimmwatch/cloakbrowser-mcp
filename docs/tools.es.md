---
description: Superficie de herramientas expuesta por CloakBrowser MCP.
icon: material/tools
tags:
  - Herramientas
  - Guía de usuario
---

# Herramientas

`cloakbrowser-mcp` expone las herramientas upstream de Playwright MCP sin cambios. Los nombres, descripciones, esquemas, anotaciones y respuestas de las herramientas provienen de `@playwright/mcp`.

## Herramientas upstream

Se espera que la superficie predeterminada de herramientas de navegador upstream coincida con la dependencia fijada de Playwright MCP. Incluye herramientas principales como navegación, snapshots, clics, escritura, capturas de pantalla, pestañas, mensajes de consola, inspección de red, subida de archivos, diálogos y herramientas de evaluación insegura.

Como referencia upstream estable, consulta la prueba de capacidades de Playwright MCP `{{ project.playwright_mcp_package_tag }}` fijada al commit exacto del paquete: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/4c1fb03bad3bae379b0ae0e3d81d2660de56bd91/tests/capabilities.spec.ts#L19-L77).

Este proyecto trata a upstream Playwright MCP como fuente autorizada y no mantiene una copia de referencia de esquemas.

El conjunto predeterminado contiene 24 herramientas upstream.
`PLAYWRIGHT_MCP_CAPS=devtools` pasa la capacidad `devtools` al proceso hijo sin
una opción `--caps` del puente; las herramientas y los esquemas upstream
resultantes se reenvían sin cambios, incluidos `browser_start_recording` y
`browser_stop_recording`.

## Herramientas locales

### `cloakbrowser_binary_info`

Devuelve información estructurada sobre el paquete CloakBrowser, la plataforma actual, el directorio de caché, la ruta binaria esperada, el estado de instalación y el resolved executable path usado por el puente.

### `cloakbrowser_bridge_info`

Devuelve metadatos estructurados del puente:

- nombre y versión del servidor MCP;
- modo de ejecución;
- paquete y versión de upstream Playwright MCP;
- cantidad de herramientas upstream;
- nombres de herramientas locales específicas de Cloak.

La superficie local sigue limitada a estas dos herramientas de diagnóstico.
`SessionSeats` y `getSessionSeats` no se exponen como una herramienta MCP porque
CloakBrowser 0.5.10 no exporta esa API desde su punto de entrada público.

## Paridad

CI construye la imagen Docker y ejecuta `npm run bridge:compare`. Ese script inicia en paralelo la imagen oficial de Playwright MCP y la imagen del puente CloakBrowser, compara la lista de herramientas upstream y ejercita las herramientas de navegador upstream predeterminadas contra la misma página fixture.

Usa `--report` para escribir un informe JSON legible por máquina:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI sube ese informe como artefacto para construcciones Docker y construcciones de release.
