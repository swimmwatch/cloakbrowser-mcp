---
description: Ejecuta la imagen de Docker de CloakBrowser MCP para una automatización repetible del navegador Playwright MCP con CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

La imagen publicada muestra el entorno de ejecución recomendado para un uso repetible de MCP.

## Correr

```bash
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Los artefactos se guardan en `/data` dentro del contenedor. Monta esa ruta para conservar capturas de pantalla, instantáneas, descargas y datos de salida de red.

Se recomienda utilizar `--init`, ya que la automatización del navegador puede crear procesos secundarios de corta duración. El proceso de inicialización de Docker elimina esos procesos secundarios de forma limpia.

Las mismas etiquetas de versión se publican en Docker Hub como `swimmwatch/cloakbrowser-mcp` y en GHCR como `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## HTTP con transmisión continua

Para el uso local de Streamable HTTP, publica el puerto del contenedor en el bucle de retorno:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Para acceder directamente a HTTPS desde el contenedor, monta los archivos de tu certificado y selecciona HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

La conexión `127.0.0.1:3000` del lado del host mantiene el punto final en el entorno local. Si publicas Streamable HTTP en una interfaz que no sea de bucle cerrado, utiliza HTTPS con autenticación, o coloca el servidor detrás de un proxy inverso de confianza con terminación TLS, autenticación y controles de red.
Streamable HTTP expone las pruebas fijas `GET /healthz` y `GET /readyz` en el mismo host y puerto. Si se configura `--http-auth-token` o `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, las sondas requieren el mismo encabezado `Authorization: Bearer ...` que las solicitudes MCP.
Consulte la [Referencia de la CLI](generated/cli.md) generada para conocer todos los indicadores de transporte HTTP y las variables de entorno.

## Coincidencia de proxies GeoIP

Docker utiliza las mismas variables de entorno de proxy y GeoIP que npm. Activa
la coincidencia de proxy GeoIP cuando el control de calidad regional necesite que CloakBrowser utilice las huellas de zona horaria, idioma y
configuración regional para ajustarse a la ubicación del proxy configurada:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

En el caso de los servidores proxy autenticados, incluye las credenciales en la URL del proxy y codifica mediante el formato «porcentaje»
los caracteres especiales que aparezcan en el nombre de usuario o la contraseña.

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
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` |
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
        "--init",
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
