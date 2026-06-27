---
description: Guía sobre el modelo de seguridad y los riesgos de automatización del navegador para CloakBrowser MCP, el aislamiento de Docker, los artefactos, los secretos y la exposición de la red.
icon: material/shield-lock
tags:
  - Security
  - User Guide
---

# Seguridad

Este proyecto es un puente de automatización del navegador. Considéralo como una infraestructura para la ejecución de código de confianza.

## Límite de confianza

El servidor externo es compatible con stdio y Streamable HTTP. Inicia el MCP de Playwright (upstream) como un proceso secundario y reenvía las llamadas de la herramienta. La automatización del navegador, la salida de archivos, el acceso a la red y el comportamiento de evaluación no segura están controlados por el MCP de Playwright (upstream).

No expongas el servidor stdio a través de un envoltorio de red sin autenticación. Cualquier cliente que pueda llamar a las herramientas puede controlar el navegador, leer los datos de la página a los que el navegador tiene acceso y solicitar artefactos.

Streamable HTTP se vincula a `127.0.0.1` a través de HTTP de forma predeterminada para los clientes locales. Si lo vinculas a `0.0.0.0` o lo publicas fuera del bucle de retorno, requiere `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` o una autenticación de proxy inverso equivalente, utilice HTTPS directo con `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` y archivos TLS, o bien termine la conexión TLS en un perímetro de red de confianza, y restrinja el acceso a clientes de confianza.

## Herramientas peligrosas

Upstream Playwright MCP incluye herramientas como `browser_evaluate` y `browser_run_code_unsafe`. Estas herramientas pueden ejecutar JavaScript en el navegador o en el contexto del servidor de Playwright. Conecta este servidor únicamente a clientes de MCP en los que confíes.

## Configuración

Utiliza opciones de «upstream» para los controles de acceso y las medidas de protección:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

Se trata de medidas de seguridad de carácter preventivo, que no sustituyen al aislamiento de procesos, contenedores, redes y sistemas de archivos.

Utiliza listas de permitidos para destinos de confianza siempre que sea posible. Considera el acceso sin restricciones a los archivos y los archivos de secretos como capacidades sensibles y manténlos fuera de los perfiles compartidos de los clientes MCP.

## Modo Sandbox

La imagen de Docker utiliza por defecto `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true`, ya que el entorno aislado del navegador no suele estar disponible en entornos de ejecución de CI y MCP en contenedores. Se trata de una solución de compromiso en materia de compatibilidad. Si tu host y el entorno de ejecución del contenedor admiten el entorno aislado de Chromium, configura lo siguiente:

```bash
CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=false
```

Si se ejecuta sin el entorno aislado de Chromium, utiliza Docker u otro mecanismo de aislamiento de procesos y evita montar directorios del host de forma generalizada.

## Artefactos y secretos

Las capturas de pantalla, las instantáneas, las descargas, los registros de red, los registros de consola y los rastros pueden contener credenciales o contenido privado de las páginas. Monta únicamente el directorio de artefactos que necesites, límpialo después de usarlo y evita compartir públicamente los paquetes de artefactos.

Si tu cliente MCP introduce credenciales en las sesiones del navegador, da preferencia a las credenciales de corta duración y con ámbito limitado al sitio de destino. No incluyas tokens de larga duración en capturas de pantalla, respuestas de red ni perfiles persistentes del navegador.

## Docker

Se recomienda utilizar Docker cuando se busque aislamiento y que las dependencias del navegador sean reproducibles. Monta solo el directorio de artefactos que necesites y utiliza `--init` para que los procesos secundarios del navegador se eliminen correctamente.

Al publicar Streamable HTTP desde Docker, es preferible utilizar `-p 127.0.0.1:3000:3000`. La publicación directa en una interfaz pública permite a cualquier navegador de cliente al que se pueda acceder realizar tareas de automatización, a menos que se añadan controles de autenticación y de red.

La imagen de Docker se analiza con Trivy en el proceso de integración continua (CI) y antes de la publicación de la versión. El analizador comprueba las vulnerabilidades de gravedad alta y crítica del sistema operativo y las bibliotecas, y, si está habilitado, sube los resultados SARIF al escáner de código de GitHub.

## Controles de la cadena de suministro

El repositorio utiliza comprobaciones gratuitas, propias de GitHub y de código abierto:

- CodeQL para el análisis estático de JavaScript y TypeScript.
- Dependency Review para detectar cambios en las dependencias de las solicitudes de incorporación de cambios.
- `npm audit --omit=dev --audit-level=high` para las dependencias de npm en tiempo de ejecución.
- OpenSSF Scorecard para señales de la cadena de suministro del repositorio.
- zizmor para la revisión de seguridad de GitHub Actions.
- Trivy para el análisis de vulnerabilidades de imágenes de Docker.

Estas comprobaciones no sustituyen a la revisión manual del comportamiento de la automatización del navegador ni a los cambios de versión.

## Informes

Notifica las vulnerabilidades mediante [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
