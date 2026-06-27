---
title: Comportamiento de entrada humanizado
description: Activa el comportamiento similar al de un ser humano del ratón, el teclado y el desplazamiento de CloakBrowser para sesiones de control de calidad sensibles a la interacción y sesiones HTTP transmitibles.
icon: material/gesture-tap
tags:
  - Configuration
  - Humanize
  - User Guide
---

# Comportamiento de entrada humanizado

El comportamiento de entrada humanizado canaliza las interacciones de la página a través de la
capa de ratón, teclado y desplazamiento de CloakBrowser, que imita el comportamiento humano. Resulta útil cuando el equipo de control de calidad necesita un
ritmo, un movimiento del puntero, una cadencia de escritura y un comportamiento de desplazamiento más realistas que
los que ofrece la automatización estándar.

El puente no añade nuevas herramientas al navegador ni modifica los esquemas de Playwright MCP
de origen. Aplica el parche de interacción con la página de CloakBrowser durante la inicialización de la página de Playwright MCP,
por lo que las herramientas existentes siguen funcionando con los mismos datos de entrada.

## Qué cambia

Cuando `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, CloakBrowser puede humanizar las acciones habituales de la página,
entre las que se incluyen:

- movimientos y clics del ratón;
- escritura en el teclado y pulsaciones de teclas;
- cumplimentación de formularios y cambio de campo;
- desplazamiento y comportamiento de «desplazamiento hasta un elemento».

Esto afecta a la sincronización de las interacciones y a los patrones de movimiento. No modifica el
contenido de la página, el enrutamiento de red, la configuración del proxy ni la geolocalización del navegador.

## Configuración general

Utiliza la variable de entorno cuando se desee que todas las sesiones de stdio o las sesiones HTTP predeterminadas de Streamable
adopten un comportamiento más intuitivo:

```bash
CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
npx -y cloakbrowser-mcp@latest
```

La misma configuración funciona con el indicador explícito de la CLI:

```bash
npx -y cloakbrowser-mcp@latest --humanize --human-preset careful
```

## Configuración de Docker

Pasa la misma variable de entorno al contenedor:

```bash
docker run --rm --init -i \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

En el caso de Streamable HTTP en Docker, la variable de entorno se convierte en el valor predeterminado para
las nuevas sesiones HTTP:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## Configuración de HTTP «Streamable» por sesión

Los clientes HTTP compatibles con Streamable pueden optar por un comportamiento humanizado en el momento de la
inicialización de la sesión MCP. Esto permite a un servidor comparar el comportamiento de interacción estándar y el humanizado
sin necesidad de reiniciarse.

Envía los metadatos del puente en la solicitud `initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`humanize` anula la configuración a nivel de proceso para esa sesión HTTP. Utilice
`true` para habilitar el comportamiento humanizado o `false` para desactivarlo, incluso si el
servidor se inició con `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`.

`humanPreset` acepta `default` o `careful` y selecciona el ajuste preestablecido de comportamiento humano
de CloakBrowser para la sesión. No activa el comportamiento humanizado por
sí mismo; establecer `humanize: true` o habilitar `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`.
El preajuste `careful` es más lento y cauteloso que `default`.

Las sesiones HTTP existentes son inmutables. Crea otra sesión HTTP de Streamable para
alternar entre el comportamiento estándar y el humanizado.

## Casos de uso

<div class="grid cards" markdown>

- :material-form-textbox: **QA de formularios**

  Ejercita escritura, rellenado, cambios de foco y flujos de validación con una cadencia
  de teclado más realista.

- :material-cart-check: **Flujos de compra**

  Prueba rutas de compra con muchas interacciones donde el tiempo de escritura, clics y
  cambio de campos puede afectar la validación del cliente.

- :material-shield-search: **Comprobaciones de UI sensibles a la interacción**

  Compara la automatización estándar con la interacción humanizada cuando una página reacciona
  de forma distinta a entradas muy rápidas o perfectamente lineales.

- :material-mouse-scroll-wheel: **Páginas con mucho desplazamiento**

  Valida páginas largas, feeds, listas de productos y contenido lazy-loading con
  un desplazamiento más suave.

- :material-presentation-play: **Demos y grabaciones**

  Produce sesiones de navegador que parezcan menos mecánicas durante demos de producto,
  walkthroughs o evidencias QA grabadas.

</div>

## Precedencia y límites

| Área | Comportamiento |
| --- | --- |
| Stdio | Usa solo variables de entorno y flags de CLI a nivel de proceso. |
| Valor predeterminado de Streamable HTTP | Usa variables de entorno y flags de CLI a nivel de proceso cuando no se proporcionan metadatos runtime. |
| Metadatos Streamable HTTP | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"].humanize` puede sobrescribir el comportamiento humanizado para una sesión. `humanPreset` puede seleccionar `default` o `careful`. |
| Sesiones existentes | Conservan la configuración humanize capturada durante `initialize`. |
| Motor de navegador | Aplica solo cuando `PLAYWRIGHT_MCP_BROWSER_ENGINE=cloak`. |
| Esquemas de herramientas | Los esquemas de herramientas de navegador de upstream Playwright MCP permanecen sin cambios. |
| Configuración personalizada | `humanConfig` no se acepta todavía de forma intencionada; la configuración estructurada necesita un esquema de validación explícito. |

Esta función está destinada a pruebas legítimas de control de calidad, realismo de la interacción y coherencia.
No debe considerarse una forma de eludir los controles de acceso ni las comprobaciones de políticas.

## Configuración relacionada

- [Configuración](configuration.md) enumera todas las variables de entorno del puente y del servidor de origen.
- [Coincidencia de proxy GeoIP](geoip-proxy-matching.md) explica los perfiles de proxy coherentes con la región.
- [Herramientas](tools.md) explica por qué las herramientas del navegador Playwright MCP de origen se reenvían sin modificaciones.
