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

Como referencia upstream estable, consulta la prueba de capacidades de Playwright MCP `{{ project.playwright_mcp_package_tag }}` fijada al commit exacto del paquete: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/36ec986b8b1fc6b4d11f2b6971147755e1b0bc84/tests/capabilities.spec.ts#L19-L77).

Este proyecto trata a upstream Playwright MCP como fuente autorizada y no mantiene una copia de referencia de esquemas.

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

## Paridad

CI construye la imagen Docker y ejecuta `npm run bridge:compare`. Ese script inicia en paralelo la imagen oficial de Playwright MCP y la imagen del puente CloakBrowser, compara la lista de herramientas upstream y ejercita las herramientas de navegador upstream predeterminadas contra la misma página fixture.

Usa `--report` para escribir un informe JSON legible por máquina:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI sube ese informe como artefacto para construcciones Docker y construcciones de release.
