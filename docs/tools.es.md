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

Como referencia estable para Playwright MCP `@playwright/mcp@0.0.83`, consulta la prueba de capacidades fijada al commit de ese paquete: [herramientas predeterminadas y herramientas habilitadas por capacidades](https://github.com/microsoft/playwright-mcp/blob/f183dad4a52965583e3cc1d59b88cdc279e2e57d/tests/capabilities.spec.ts#L19-L74). La dependencia instalada define la superficie actual de herramientas.

Este proyecto trata a upstream Playwright MCP como fuente autorizada y no mantiene una copia de referencia de esquemas.

El conjunto predeterminado contiene 25 herramientas upstream, incluida `browser_emulate_media`.
`PLAYWRIGHT_MCP_CAPS=devtools` pasa la capacidad `devtools` al proceso hijo sin
una opción `--caps` del puente; las herramientas y los esquemas upstream
resultantes se reenvían sin cambios, incluidos `browser_start_recording` y
`browser_stop_recording`.

!!! warning "Limitación de grabación con el binario público CloakBrowser v146"
    Las herramientas de grabación están disponibles, pero el binario público de Chromium 146 sin clave desactiva deliberadamente el enlace de Playwright entre la página y el host para preservar el sigilo. Por ello, `browser_stop_recording` puede devolver código parcial: se graba la navegación, pero se omiten las entradas y los clics realizados correctamente. Revisa las grabaciones generadas antes de reutilizarlas.

    La compatibilidad de activación explícita se sigue en [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    La decisión subyacente sobre el enlace se analiza en
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) y
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

### Herramientas WebMCP dinámicas

La compatibilidad con WebMCP depende de la compilación del navegador y las funciones habilitadas. El Playwright MCP instalado espera `document.modelContext` o `navigator.modelContext` con un método `getTools()`. Si necesitas WebMCP, usa una compilación compatible de CloakBrowser o `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`.

[La documentación de Chrome sobre WebMCP](https://developer.chrome.com/docs/ai/webmcp) describe una prueba de origen desde Chrome 149, un indicador para pruebas locales y limitaciones del modo sin interfaz. El número de versión de Chromium por sí solo no garantiza compatibilidad con la API que espera Playwright MCP.

Cuando Chromium se inicia con `--enable-features=WebMCP`, Playwright MCP puede añadir herramientas proporcionadas por la página con nombres `webmcp_*` mientras esta permanece abierta. Estas herramientas son dinámicas: el puente anuncia `tools.listChanged`, invalida toda su caché paginada de herramientas cuando el servidor upstream envía `notifications/tools/list_changed` y reenvía la notificación al cliente MCP de la sesión correspondiente. Los clientes deben escuchar esa notificación y volver a llamar a `tools/list`. Un cliente Streamable HTTP solo la recibe mientras está abierto el flujo de notificaciones de su sesión; la siguiente llamada a `tools/list` sigue devolviendo información actualizada aunque no hubiera ningún flujo abierto.

Las herramientas dinámicas pertenecen únicamente a la sesión MCP y a la generación actual del navegador con CDP administrado que las descubrió. Sus nombres, descripciones, esquemas, anotaciones y resultados son contenido de página no confiable y se reenvían sin que el puente los modifique. Revíselos antes de invocar las herramientas. Establezca `PLAYWRIGHT_MCP_WEBMCP=false` para desactivar la recopilación. El puente nunca habilita Chromium WebMCP automáticamente.

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

El objeto adicional `structuredContent.cdp` informa del estado de CDP administrado de la sesión que realiza la llamada:

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

`generation` aumenta y `discoveryUrl` cambia después de reemplazar el navegador. `activeConnections` cuenta las conexiones WebSocket aceptadas a través del proxy sin exponer identidades de clientes, identificadores de destinos ni contenido del protocolo. Trate cada URL de descubrimiento no nula como una credencial.

Use la URL de descubrimiento con un cliente compatible con CDP:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

CDP administrado no es el protocolo Playwright Server. El método `chromium.connect()` de Playwright y la integración actual de Open WebUI `PLAYWRIGHT_WS_URL` esperan un punto de conexión Playwright Server y no son compatibles con esta URL.

Con la versión fijada del cliente Playwright, se verificó que `browser.close()` en un navegador devuelto por `connectOverCDP()` desconecta ese cliente y deja Chromium y la generación del navegador listos. Esta observación es específica del cliente y no constituye una garantía para otras bibliotecas CDP. Enviar directamente el comando CDP `Browser.close` es destructivo: termina la generación compartida de Chromium, invalida la capability y afecta a los clientes que llaman a MCP. Coordine las operaciones MCP y CDP, ya que el puente no serializa las operaciones de navegación, cierre de páginas, entrada o modificación del almacenamiento que entran en conflicto.

La superficie local sigue limitada a estas dos herramientas de diagnóstico. `SessionSeats` y `getSessionSeats` no se exponen como herramienta MCP porque el punto de entrada público compatible de CloakBrowser no exporta esa API.

## Paridad

CI construye la imagen Docker y ejecuta `npm run bridge:compare`. Ese script inicia en paralelo la imagen oficial de Playwright MCP y la imagen del puente CloakBrowser, compara la lista de herramientas upstream y ejercita las herramientas de navegador upstream predeterminadas contra la misma página fixture.

Usa `--report` para escribir un informe JSON legible por máquina:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI sube ese informe como artefacto para construcciones Docker y construcciones de release.
