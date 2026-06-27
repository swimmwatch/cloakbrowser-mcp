---
description: Configuración en tiempo de ejecución para el puente Playwright MCP, que incluye sesiones HTTP transmitibles, asignación de proxies con reconocimiento de GeoIP y comportamiento de entrada humanizado.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Configuración

Utiliza las variables `PLAYWRIGHT_MCP_*` de upstream para el comportamiento del MCP de Playwright. Utilice `CLOAK_PLAYWRIGHT_MCP_*` únicamente para el comportamiento del puente específico de Cloak.

Las antiguas variables `CLOAKBROWSER_MCP_*` ya no son compatibles.
La [Referencia de la CLI](generated/cli.md) generada es la lista oficial de los indicadores de la CLI del puente y sus variables de entorno correspondientes.

## Opciones de puente

| Variable | Default | Description |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Bridge transport: `stdio` or `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Streamable HTTP listener protocol: `http` or `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Streamable HTTP bind host. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Streamable HTTP bind port. Use `0` for an ephemeral port in tests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Streamable HTTP endpoint path. `/healthz` and `/readyz` are reserved for probes. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Optional Bearer token required on Streamable HTTP requests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Session metadata backend. Only `memory` is implemented in this release. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Idle TTL for Streamable HTTP sessions. Expired sessions dispose their bridge and upstream child process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Maximum active Streamable HTTP sessions in one process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | TLS certificate PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | TLS private key PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | TLS PFX/PKCS12 path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Passphrase for an encrypted HTTPS key or PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Streamable HTTP operational log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Upstream Playwright MCP proxy server. Used as the GeoIP source when matching is enabled. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Upstream proxy bypass list for hosts that should not use `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Resolves `PLAYWRIGHT_MCP_PROXY_SERVER` GeoIP and matches CloakBrowser timezone and locale fingerprint flags to that proxy location. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Enables CloakBrowser human-like mouse, keyboard, and scroll behavior. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | CloakBrowser human behavior preset: `default` or `careful`. Used only when humanize is enabled. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## Coincidencia de proxy GeoIP

Configurar `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` con `PLAYWRIGHT_MCP_PROXY_SERVER`
para obtener los indicadores de zona horaria, idioma y configuración regional de CloakBrowser a partir de la
ubicación del proxy. El puente mantiene el enrutamiento del proxy delegado al MCP de Playwright
MCP y solo inyecta los indicadores de inicio resueltos `--fingerprint-timezone`, `--lang` y
`--fingerprint-locale` resueltos.

Consulta [Coincidencia de proxies GeoIP](geoip-proxy-matching.md) para ver ejemplos de configuración, metadatos de proxy HTTP
transmisibles en tiempo de ejecución, casos de uso, reglas de prioridad y limitaciones.

## Comportamiento de entrada humanizado

Establece `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` para activar la capa de CloakBrowser que simula el comportamiento humano
del ratón, el teclado y el desplazamiento para las interacciones con la página. El puente aplica esto
a través del gancho de inicialización de la página de Playwright MCP, de modo que los esquemas de las herramientas de navegador
de origen permanecen inalterados.

Consulte [Comportamiento de entrada humanizado](humanized-input-behavior.md) para ver ejemplos de configuración,
metadatos HTTP de Streamable en tiempo de ejecución, casos de uso y limitaciones.

## Metadatos de tiempo de ejecución HTTP transmitibles

Los clientes HTTP de transmisión pueden seleccionar determinadas opciones de tiempo de ejecución para cada sesión de MCP añadiendo
metadatos específicos del puente a la solicitud `initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true,
        "headless": false,
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`proxyServer` anula `PLAYWRIGHT_MCP_PROXY_SERVER` para esa sesión HTTP.
`proxyBypass` sustituye a `PLAYWRIGHT_MCP_PROXY_BYPASS` únicamente cuando `proxyServer` está
presente. `geoipProxyMatch` puede activar o desactivar la coincidencia de GeoIP para esa sesión
sin reiniciar el servidor MCP. Las sesiones existentes conservan su proxy de inicio;
crea una nueva sesión HTTP para cambiar de ubicación.

`humanize` puede activar o desactivar el comportamiento de entrada humanizado para esa sesión
sin afectar a las demás sesiones. `humanPreset` puede seleccionar `default` o `careful`
para esa sesión, pero no activa por sí mismo el comportamiento humanizado. Las sesiones
existentes conservan el comportamiento capturado durante `initialize`.

`headless` puede activar o desactivar el modo de navegador sin interfaz gráfica para esa sesión. Configurar
`headless` en `false` requiere un entorno de visualización operativo, especialmente en
implementaciones en Docker o en servidores Linux.

Las credenciales de proxy HTTP autenticadas se pueden incrustar en `proxyServer`, por
ejemplo `http://user:pass@proxy.example:8080`. Codifica en formato «percent» los
caracteres de las credenciales que tengan significado en una URL, como `@`, `:`, `/`, `?`, `#`, y `%`.

Para los patrones de control de calidad en múltiples ubicaciones, consulta [Coincidencia de proxy GeoIP](geoip-proxy-matching.md).
Para los patrones de realismo en la interacción, véase [Comportamiento de entrada humanizado](humanized-input-behavior.md).

## Opciones de origen

El puente reenvía la configuración de `PLAYWRIGHT_MCP_*` al MCP de Playwright situado en la parte superior de la cadena. Esto incluye opciones de la parte superior de la cadena como:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`
- `PLAYWRIGHT_MCP_USER_DATA_DIR`

Consulta la documentación de Playwright MCP del proyecto original para conocer todas las opciones disponibles.

## Registro

El modo HTTP «Streamable» escribe registros de inicio y de solicitudes legibles para el usuario en stdout. El modo «stdio» no genera registros operativos rutinarios, por lo que la salida stdout de MCP JSON-RPC se mantiene libre de datos del protocolo. Los errores graves de inicio de la CLI siguen registrándose en stderr.

## HTTPS

Streamable HTTP utiliza HTTP local de forma predeterminada. Selecciona TLS directo con `--http-protocol https` o `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` y, a continuación, facilite un par de certificado y clave o un archivo PFX:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Para una exposición externa o sin bucle cerrado, utiliza HTTPS junto con `--http-auth-token`, o bien termina el TLS en un proxy inverso de confianza que también aplique controles de autenticación y de acceso a la red.

## Sesiones HTTP transmisibles

Cada sesión HTTP de Streamable MCP cuenta con su propio entorno de ejecución de puente y su propio proceso hijo de Playwright MCP en el nivel superior. Las sesiones HTTP ejecutan Playwright MCP en el nivel superior con un perfil de navegador aislado, de modo que los usuarios simultáneos no compiten por el mismo perfil persistente de Chromium. El backend de sesión integrado `memory` almacena únicamente metadatos, como el ID de sesión, las marcas de tiempo, la fecha de caducidad y el estado. El estado del navegador permanece en el proceso hijo activo de nivel superior, y los artefactos siguen estando controlados por `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Para el escalado horizontal, ejecuta varias réplicas del servidor detrás de un equilibrador de carga con sesiones persistentes identificadas mediante el encabezado `mcp-session-id`. Los futuros backends de Redis, Postgres o SQLite podrán coordinar metadatos y bloqueos, pero no podrán restaurar una sesión de navegador activa una vez que se haya cerrado el proceso al que pertenece.

## Sondas HTTP con transmisión continua

Cuando el puente funciona con `--transport streamable-http`, expone puntos finales de sonda fijos en el mismo host y puerto que el punto final del MCP:

- `GET /healthz` devuelve metadatos sobre el estado del proceso: `status`, `version`, `transport` y `uptimeMs`.
- `GET /readyz` devuelve metadatos de disponibilidad y capacidad de sesión: `sessions.active`, `sessions.pending`, `sessions.max` y `sessions.available`.

La disponibilidad devuelve HTTP `200` mientras haya capacidad de sesión disponible y HTTP `503` cuando `active + pending >= max`.
Si se configura `--http-auth-token` o `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, ambas sondas requieren el mismo encabezado `Authorization: Bearer ...` que las solicitudes MCP. Sin un token de autenticación, las sondas permanecen abiertas en la dirección de enlace HTTP configurada.
