---
title: Coincidencia de proxy GeoIP
description: Coincide las huellas de zona horaria, idioma y configuración regional de CloakBrowser con una ubicación de proxy configurada para el control de calidad regional y las sesiones HTTP de Streamable.
icon: material/map-marker-radius
tags:
  - Configuration
  - GeoIP
  - Proxy
  - User Guide
---

# Coincidencia de proxies GeoIP

La correspondencia de proxy GeoIP mantiene la configuración de la huella digital del navegador alineada con la ubicación del proxy
utilizada por el MCP de Playwright de nivel superior. Resulta útil cuando el control de calidad regional depende
de un proxy, una zona horaria, un idioma y un perfil de configuración regional coherentes.

El puente no crea ni enruta tráfico de proxy por sí mismo. Pasa
`PLAYWRIGHT_MCP_PROXY_SERVER` a la preparación del inicio de CloakBrowser.
Cuando la coincidencia está habilitada, CloakBrowser resuelve la ubicación de
salida del proxy configurado y añade los indicadores de inicio correspondientes
para la zona horaria, el idioma del navegador, la configuración regional de la
huella y la IP de WebRTC.

## Qué cambia

Cuando `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true`, el puente puede añadir estos
parámetros de inicio para CloakBrowser:

- `--fingerprint-timezone`
- `--lang`
- `--fingerprint-locale`
- `--fingerprint-webrtc-ip`

Esto contribuye a que el perfil del navegador presente una coherencia interna con la región del proxy.
Los esquemas de la herramienta MCP de Playwright y las herramientas del navegador se siguen reenviando
sin modificaciones.

## Configuración general

Utiliza variables de entorno a nivel de proceso para los clientes stdio y como valor predeterminado para
las sesiones HTTP «Streamable»:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

Añade una lista de exclusión cuando algunos hosts deban evitar el proxy:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
PLAYWRIGHT_MCP_PROXY_BYPASS=".internal,localhost" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

Los proxies HTTP autenticados son compatibles mediante la incorporación de credenciales en
`PLAYWRIGHT_MCP_PROXY_SERVER`. Codifica los caracteres especiales de las credenciales en formato «percent»,
por ejemplo, utiliza `p%40ssword` en lugar de `p@ssword`.

Los binarios de CloakBrowser compatibles usan autenticación nativa integrada en
la URL y notifican la IP de salida real del proxy, incluso cuando este exige una
solicitud CONNECT autenticada estricta. Los binarios antiguos conservan el
objeto proxy de Playwright como alternativa de compatibilidad.

## Configuración de Docker

Pasa las mismas variables al contenedor. Guarda las credenciales del proxy en tu gestor de secretos
o en el entorno del cliente MCP siempre que sea posible.

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Para Streamable HTTP en Docker, publica el puerto HTTP como de costumbre y mantén las variables de proxy
como valores predeterminados del entorno del contenedor:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## Proxy HTTP con transmisión por sesión

Los clientes HTTP con capacidad de transmisión pueden seleccionar un proxy en el momento de la inicialización de la sesión de MCP.
Esto permite que un único servidor MCP de ejecución prolongada gestione diferentes escenarios regionales sin
necesidad de reiniciarse.

Envía los metadatos del puente en la solicitud `initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true
      }
    }
  }
}
```

`proxyServer` anula `PLAYWRIGHT_MCP_PROXY_SERVER` para esa sesión HTTP.
`proxyBypass` anula `PLAYWRIGHT_MCP_PROXY_BYPASS` solo cuando `proxyServer` está
presente. Si `proxyServer` está presente y se omite `proxyBypass`, la
configuración heredada de omisión del proxy se borra para esa sesión.

`geoipProxyMatch` anula la configuración de GeoIP a nivel de proceso para esa sesión HTTP.
Utiliza `true` para habilitar la coincidencia para la sesión o `false` para deshabilitarla
incluso si el servidor se inició con la coincidencia habilitada.

Las sesiones HTTP existentes son inmutables. Crea otra sesión HTTP de Streamable para
cambiar a un proxy o una ubicación diferentes.

Si `proxyServer` contiene credenciales, manténlas codificadas en formato URL y transmite el valor
a través de secretos o de la configuración de tiempo de ejecución del cliente, en lugar de incluirlo en
los archivos del proyecto.

## Casos de uso

<div class="grid cards" markdown>

- :material-cart-check: **QA de comercio localizado**

  Prueba checkout, impuestos, mensajes de envío, moneda y reglas regionales de catálogo
  con la zona horaria y la configuración regional del navegador alineadas con la ubicación del proxy.

- :material-web: **Landing pages regionales**

  Verifica idioma, consentimiento, campañas y variantes de contenido que dependen de la región
  del visitante.

- :material-lifebuoy: **Reproducción para soporte**

  Reproduce un reporte desde la región de un cliente sin reiniciar todo el servidor MCP
  para cada ubicación de proxy.

- :material-clock-check: **Flujos sensibles a zona horaria**

  Valida selectores de fecha, ventanas de reserva, recordatorios y páginas de planificación donde
  la zona horaria y la configuración regional deben coincidir con la región de red.

- :material-source-branch-sync: **Sesiones regionales paralelas**

  Ejecuta sesiones Streamable HTTP separadas con diferentes proxies para que un agente pueda
  comparar varias regiones en un solo proceso de servidor.

</div>

## Precedencia y límites

| Área | Comportamiento |
| --- | --- |
| Stdio | Usa solo variables de entorno y flags de CLI a nivel de proceso. |
| Valor predeterminado de Streamable HTTP | Usa variables de entorno y flags de CLI a nivel de proceso cuando no se proporcionan metadatos runtime. |
| Metadatos Streamable HTTP | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"]` puede sobrescribir el proxy y la coincidencia GeoIP para una sesión. |
| Sesiones existentes | Conservan el proxy y la configuración GeoIP capturados durante `initialize`. |
| Proxy HTTP autenticado | Usa la autenticación nativa integrada en la URL de CloakBrowser en los binarios compatibles y el objeto proxy de Playwright en los binarios antiguos. |
| Indicadores de zona horaria/configuración regional sin procesar | Los valores explícitos `--fingerprint-timezone`, `--lang` y `--fingerprint-locale` de `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` tienen prioridad sobre los valores derivados de GeoIP y no se duplican. |
| Browser geolocation API | No se configura con esta función; solo alinea los valores de huella de zona horaria, idioma, configuración regional e IP de WebRTC de CloakBrowser. |

Los datos de ubicación de GeoIP son aproximados y dependen de la IP del proxy y de la
base de datos de GeoIP de CloakBrowser. CloakBrowser descarga y almacena en caché esa base de datos sin conexión la primera
vez que se utiliza, cuando es necesario.

Por ejemplo, la siguiente configuración conserva la zona horaria y la
configuración regional explícitas mientras sigue usando la coincidencia GeoIP
para resolver la IP de salida del proxy:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS='["--fingerprint-timezone=America/New_York","--lang=en-US","--fingerprint-locale=en-US"]' \
npx -y cloakbrowser-mcp@latest
```

Utiliza esta función para realizar pruebas legítimas de control de calidad, localización y coherencia entre entornos.
No debe considerarse una forma de eludir los controles de acceso ni las
comprobaciones de políticas regionales.

## Configuración relacionada

- [Configuración](configuration.md) enumera todas las variables de entorno del puente y del entorno de origen.
- [Docker](docker.md) explica los valores predeterminados del tiempo de ejecución de los contenedores y la publicación HTTP de Streamable.
- [Herramientas](tools.md) explica por qué las herramientas de navegador Playwright MCP de origen se reenvían sin modificaciones.

## Más rutas prácticas

Para elegir entre Playwright MCP upstream y este paquete, consulta la [comparación](comparison.md). Para tareas rápidas, usa las [recetas](recipes/index.md): perfil persistente, extensiones, reverse proxy, QA regional, Claude Desktop, Codex CLI y prueba smoke de CI.
