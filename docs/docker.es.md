---
description: Ejecuta la imagen de Docker de CloakBrowser MCP para una automatización repetible del navegador Playwright MCP con perfiles persistentes en /data, montajes de extensiones y CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

La imagen publicada muestra el entorno de ejecución recomendado para un uso repetible de MCP.

## Correr

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Los artefactos se guardan en `/data` dentro del contenedor. Monta esa ruta para conservar capturas de pantalla, instantáneas, descargas y datos de salida de red.

La imagen ya ejecuta Tini como PID 1 y subreaper, por lo que los comandos normales no necesitan un proceso init adicional de Docker.

## Sesiones headed, health check y runtime restringido

Con headless: false, el contenedor inicia Xvfb privado bajo demanda y lo conserva hasta que el contenedor termina. No es un escritorio visible ni un servicio de VNC, noVNC, RDP, host X11 o captura de pantalla. Los contextos, páginas, perfiles y artefactos de Playwright están aislados, pero el focus, clipboard y la captura de pantalla nativos de X11 no son límites de aislamiento entre tenants. El health check de Docker usa un Unix socket privado para comprobar el event loop de MCP CLI y, si Xvfb se inició, su disponibilidad; no envía tráfico por MCP stdio ni sustituye /healthz o /readyz. Para un read-only root filesystem, monte /data y proporcione tmpfs writable para /tmp y /tmp/.X11-unix si son posibles las sesiones headed.

Las mismas etiquetas de versión se publican en Docker Hub como `swimmwatch/cloakbrowser-mcp` y en GHCR como `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Perfiles persistentes

Docker no habilita un perfil de navegador persistente de forma predeterminada.
Usa el volumen existente `/data` como raíz de persistencia cuando quieras que las
cookies, el almacenamiento local, la caché o el estado de las extensiones
sobrevivan a los reinicios del contenedor:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Las variables de entorno dentro de Docker deben usar rutas del contenedor, como
`/data/profiles/default`, no rutas del host. El puente crea el directorio de
perfil si falta, comprueba que se pueda escribir, escribe la ruta del contenedor
en la configuración generada de Playwright MCP y rechaza directorios de perfil
activos duplicados dentro de un mismo proceso del servidor.

## Caché de licencia de CloakBrowser

La imagen almacena los binarios de CloakBrowser, el estado de la licencia y la
caché de validación en `/home/node/.cloakbrowser`. Monta allí un volumen con
nombre para conservar un inicio de sesión de nivel gratuito de GitHub o Pro al
reemplazar el contenedor:

```bash
docker volume create cloakbrowser-cache

docker run --rm -it \
  --entrypoint node \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  swimmwatch/cloakbrowser-mcp:latest \
  /opt/cloakbrowser-mcp/node_modules/cloakbrowser/dist/cli.js login

docker run --rm -i \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Usa el mismo volumen con el comando original `info` o `logout` para consultar o
eliminar el inicio de sesión guardado. Como alternativa, inyecta
`CLOAKBROWSER_LICENSE_KEY` mediante la gestión de secretos del contenedor. No
incluyas claves de licencia en capas de imagen, archivos Compose registrados en
el control de versiones ni salidas de comandos capturadas como evidencia de
compilación.

## Extensiones de Chrome

Las extensiones de Chrome requieren un perfil persistente y deben montarse por
separado. Usa rutas del contenedor en las variables de entorno, no rutas del
host. El montaje de la extensión puede ser de solo lectura:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Usa una matriz JSON para `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` cuando una ruta
contenga comas o al pasar varios directorios de extensiones. Reinicia el
contenedor después de cambiar archivos o rutas de extensiones.

El modo de conexión Playwright Extension es distinto del montaje de una extensión desempaquetada mostrado arriba. Requiere la extensión oficial en un persistent Chrome/Edge profile y `PLAYWRIGHT_MCP_EXTENSION_TOKEN`. Monta cada profile en un writable path separado, inyecta el token con un secret manager y no combines `PLAYWRIGHT_MCP_EXTENSION=true` con `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`.

## HTTP con transmisión continua

Para el uso local de Streamable HTTP, publica el puerto del contenedor en el bucle de retorno:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Para acceder directamente a HTTPS desde el contenedor, monta los archivos de tu certificado y selecciona HTTPS:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

La conexión `127.0.0.1:3000` del lado del host mantiene el punto final en el entorno local. Si publicas Streamable HTTP en una interfaz que no sea de bucle cerrado, utiliza HTTPS con autenticación, o coloca el servidor detrás de un proxy inverso de confianza con terminación TLS, autenticación y controles de red.
Streamable HTTP expone las pruebas fijas `GET /healthz` y `GET /readyz` en el mismo host y puerto. Si se configura `--http-auth-token` o `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, las sondas requieren el mismo encabezado `Authorization: Bearer ...` que las solicitudes MCP.
Consulte la [Referencia de la CLI](generated/cli.md) generada para conocer todos los indicadores de transporte HTTP y las variables de entorno.

## Gestionado CDP { #managed-cdp }

Publique el rango gestionado CDP configurado uno a uno. Este ejemplo de stdio permite uno
sesión y mantiene cada puerto del host vinculado al bucle local:

```bash
docker run --rm -i \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --cdp-enabled \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

`--cdp-host 0.0.0.0` es necesario para el reenvío de puertos de Docker, por lo que el explícito
También se requiere la participación voluntaria `--cdp-allow-remote` y el concreto `--cdp-advertised-host`.
No reasigne el rango a diferentes números de puerto del host: las URL de descubrimiento contienen el
El puerto arrendado y cada puerto publicado deben enrutarse uno a uno a su sesión propietaria.

Para Streamable HTTP de múltiples sesiones, configure y publique el grupo sin establecer el
procesar por defecto si los clientes deben optar individualmente:

```bash
docker run --rm \
  -p 127.0.0.1:3000:3000 \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http \
  --http-host 0.0.0.0 \
  --http-port 3000 \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

Una solicitud autenticada `initialize` con arrendamientos `cdpEnabled: true` publica uno
puerto. Un valor omitido hereda el valor predeterminado del proceso, mientras que `cdpEnabled: false`
se excluye explícitamente y no consume ningún puerto CDP. La saturación de la reserva rechaza solo uno nuevo
Sesión habilitada con CDP; no reduce la capacidad de las sesiones deshabilitadas.

Lea el URL portador de capacidad desde `cloakbrowser_bridge_info`. No lo ponga dentro
registros de contenedores o verificaciones de estado. Conéctese con un CDP API como
`chromium.connectOverCDP()`; el URL no es compatible con Playwright
`chromium.connect()` o el flujo actual Open WebUI.

`--cdp-advertised-scheme https` cambia las URLs publicadas a `https`/`wss`, pero el
el puente no proporciona TLS para CDP gestionado. Utilice un terminador TLS propiedad del operador que
ocupa el mismo puerto anunciado en el espacio de nombres de la red externa, conserva
`Host`/`Origin`, y reenvía uno a uno al oyente del puente de texto plano. El
El puente a Chromium hop también mantiene el tráfico de bucle invertido en texto plano.

## Coincidencia de proxies GeoIP

Docker utiliza las mismas variables de entorno de proxy y GeoIP que npm. Activa
la coincidencia de proxy GeoIP cuando el control de calidad regional necesite que CloakBrowser utilice las huellas de zona horaria, idioma y
configuración regional para ajustarse a la ubicación del proxy configurada:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

En el caso de los servidores proxy autenticados, incluye las credenciales en la URL del proxy y codifica mediante el formato «porcentaje»
los caracteres especiales que aparezcan en el nombre de usuario o la contraseña.

Los binarios de CloakBrowser compatibles usan autenticación proxy nativa
integrada en la URL; los binarios antiguos recurren al objeto proxy de
Playwright.

Cuando el contenedor ejecuta Streamable HTTP, los clientes también pueden elegir diferentes
proxies por sesión de MCP a través de los metadatos `initialize`. Véase
[Coincidencia de proxies GeoIP](geoip-proxy-matching.md) para obtener información sobre los metadatos de proxy en tiempo de ejecución,
casos de uso multirregión y limitaciones.

## Valores predeterminados

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` |

## Configuración del cliente MCP

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Compilar localmente

```bash
npm run docker:build
npm run docker:smoke
```

El archivo Dockerfile utiliza la imagen oficial de Playwright MCP fijada como base del entorno de ejecución, aplica las actualizaciones de seguridad de Debian disponibles durante la compilación, elimina la carga útil global de npm no utilizada de la imagen del entorno de ejecución e instala el puente en `/opt/cloakbrowser-mcp`.

El flujo de trabajo de publicación publica las certificaciones de la lista de materiales de software (SBOM) y de procedencia, incluye etiquetas OCI para el origen, la revisión, la versión, la licencia, el nombre de la imagen base y el resumen de la imagen base, y analiza la imagen compilada con Trivy antes de su publicación.

## Más rutas prácticas

Para elegir entre Playwright MCP upstream y este paquete, consulta la [comparación](comparison.md). Para tareas rápidas, usa las [recetas](recipes/index.md): perfil persistente, extensiones, reverse proxy, QA regional, Claude Desktop, Codex CLI y prueba smoke de CI.
