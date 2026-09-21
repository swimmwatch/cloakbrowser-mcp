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

Como referencia upstream estable, consulta la prueba de capacidades de Playwright MCP `{{ project.playwright_mcp_package_tag }}` fijada al commit exacto del paquete: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/tests/capabilities.spec.ts#L19-L77).

Este proyecto trata a upstream Playwright MCP como fuente autorizada y no mantiene una copia de referencia de esquemas.

El conjunto predeterminado contiene 25 herramientas upstream, incluida `browser_emulate_media`.
`PLAYWRIGHT_MCP_CAPS=devtools` pasa la capacidad `devtools` al proceso hijo sin
una opción `--caps` del puente; las herramientas y los esquemas upstream
resultantes se reenvían sin cambios, incluidos `browser_start_recording` y
`browser_stop_recording`.

!!! warning "Limitación de grabación con el binario público CloakBrowser v146"
    Las herramientas de grabación están disponibles, pero el binario público de Chromium 146
    sin clave que utiliza CloakBrowser 0.5.10 desactiva deliberadamente el enlace de Playwright
    entre la página y el host para preservar el sigilo. Por ello, `browser_stop_recording` puede
    devolver código parcial: la navegación se graba, mientras que se omiten las entradas de texto
    y los clics realizados correctamente. Revisa las grabaciones generadas antes de reutilizarlas.

    La compatibilidad de activación explícita se sigue en [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    La decisión subyacente sobre el enlace se analiza en
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) y
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

### Herramientas WebMCP dinámicas

Chromium implementa WebMCP a partir de la versión 154. Las compilaciones anteriores de CloakBrowser ignoran el feature flag; si necesitas WebMCP, usa una compilación de navegador compatible o `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`.

Cuando Chromium se inicia con `--enable-features=WebMCP`, las páginas pueden declarar herramientas `webmcp_*`. El bridge reenvía `notifications/tools/list_changed`, limpia toda la caché de `tools/list` y el cliente debe volver a solicitar la lista. En Streamable HTTP, solo el flujo abierto de la sesión correspondiente recibe la notificación; el siguiente `tools/list` sigue siendo actual incluso sin flujo. Considera el nombre, la descripción, el esquema, las annotations y el output como datos de página no confiables. El bridge no activa WebMCP automáticamente; `PLAYWRIGHT_MCP_WEBMCP=false` desactiva la recopilación.

## Herramientas locales

### `cloakbrowser_binary_info`

Devuelve información estructurada sobre el paquete CloakBrowser, la plataforma actual, el directorio de caché, la ruta binaria esperada, el estado de instalación y el resolved executable path usado por el puente.

### `cloakbrowser_bridge_info`

Devuelve metadatos estructurados del puente:

El objeto aditivo `structuredContent.cdp` informa sobre el CDP administrado de la sesión que llama
estado:

```json
{ "enabled": false }
```

```json
{
  "enabled": true,
  "state": "ready",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": "http://127.0.0.1:9222/cdp/<capability>",
  "activeConnections": 0
}
```

```json
{
  "enabled": true,
  "state": "unavailable",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": null,
  "activeConnections": 0
}
```

`generation` aumenta y `discoveryUrl` rota después del reemplazo del navegador.
`activeConnections` cuenta las conexiones proxied WebSocket aceptadas sin exponer
identidades de clientes, IDs de destino o contenido del protocolo. Trate cada descubrimiento no nulo URL
como una credencial.

Use el descubrimiento URL con un cliente compatible con CDP:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

CDP administrado no es el protocolo del servidor Playwright. Playwright
`chromium.connect()` y la integración actual Open WebUI `PLAYWRIGHT_WS_URL` esperan
un punto de conexión del servidor Playwright y no son compatibles con este URL.

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
