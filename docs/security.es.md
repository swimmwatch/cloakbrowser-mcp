---
description: Guía sobre el modelo de seguridad y los riesgos de automatización del navegador para CloakBrowser MCP, el aislamiento de Docker, los artefactos, los secretos y la exposición de la red.
icon: material/shield-lock
tags:
  - Security
  - User Guide
---

# Seguridad

Este proyecto es un puente de automatización del navegador. Considéralo como una infraestructura para la ejecución de código de confianza.

## Seguridad Gestionada CDP { #managed-cdp-security }

CDP administrado está deshabilitado por defecto. Proporciona control arbitrario de Chromium DevTools,
no es una herramienta de navegador reducida API. Habilítela solo para clientes de confianza. La capacidad en
`cloakbrowser_bridge_info.cdp.discoveryUrl` es una credencial de portador: no la registres,
guárdalo en tickets, o compártelo entre sesiones. Se rota después de reemplazar el navegador
y un viejo URL nunca pasa a la generación de reemplazo.

Un enlace CDP que no sea de loopback requiere tanto `--cdp-allow-remote` como un anuncio concreto
host. Agregue controles de acceso a la red alrededor del puerto publicado. Seleccionando
`--cdp-advertised-scheme https` no proporciona TLS. El oyente gestionado y
Chromium hop permanecer en texto claro; un terminador TLS de mismo puerto propiedad del operador debe preservar
la autoridad anunciada `Host` y `Origin` y mantener el enrutamiento uno a uno hacia la
sesión propia.

Los registros de tiempo de ejecución nunca incluyen rutas de capacidad, IDs de objetivo, cargas útiles CDP, datos del navegador,
cookies, valores sin procesar `Host` o `Origin`, o rutas de perfil. Comprobaciones de seguridad rechazadas son
reportado solo como una advertencia `cdp_security_rejections` con alcance de sesión con 60 segundos
conteos de saturación para `capability`, `host` y `origin`; la limpieza vacía cualquier resto
cuentas. Las verificaciones exitosas no crean registros de auditoría por solicitud.

### Límites Fijos

Los límites se aplican de manera independiente a cada sesión habilitada para CDP MCP:

| Límite | Límite |
| --- | --- |
| Conexiones WebSocket activas a través de proxy, incluyendo los saludos en curso | 8 |
| Solicitudes concurrentes de preactualización HTTP | 16 |
| Encabezados de la solicitud | 16 KiB |
| Cuerpo de la solicitud en rutas soportadas | No permitido |
| Respuesta almacenada en búfer Chromium HTTP | 4 MiB |
| Mensaje WebSocket entrante o saliente | 16 MiB |
| Datos WebSocket no enviados en cola por dirección | 16 MiB |
| Encabezados de solicitud, respuesta upstream HTTP, o handshake WebSocket | 10 segundos |
| Apagado elegante del proxy antes del cierre forzado | 5 segundos |
| Cuerpo de respuesta de error local | 8 KiB |

### Errores HTTP

Los fallos locales usan JSON `{"error":{"code":"...","message":"..."}}` con
`Cache-Control: no-store`, `Content-Type: application/json; charset=utf-8`, y un
exact `Content-Length`. Los fallos del método también incluyen `Allow`. Las asignaciones estables son:

| Estado | Código |
| --- | --- |
| `400` | `bad_request` |
| `403` | `forbidden` |
| `404` | `not_found` |
| `405` | `method_not_allowed` |
| `408` | `request_timeout` |
| `413` | `payload_too_large` |
| `431` | `headers_too_large` |
| `500` | `internal_error` |
| `502` | `bad_gateway` |
| `503` | `unavailable` |
| `504` | `gateway_timeout` |
| Chromium `400..499` | `upstream_error`, preservando el estado |

Chromium redirecciona, errores del servidor, respuestas malformadas y fallos de transporte son
normalizado en lugar de exponer los cuerpos de respuesta Chromium. Un rechazo generado por el puente
antes de que el envío ascendente no tiene efecto secundario Chromium. Una solicitud de descubrimiento de solo lectura puede
será reintentado después de corregir la condición. Para fallas ambiguas que cambian el estado,
vuelve a leer `/json/list` y reconcilia el estado de la aplicación; no asumas `Retry-After` o
idempotencia automática

### WebSocket Cierra

Los cierres generados localmente usan pares enmascarados fijos. Los cierres válidos de pares se retransmiten.

| Código | Razón | Usar |
| --- | --- | --- |
| `1001` | `going_away` | Cierre de sesión, generación o proxy |
| `1002` | `protocol_error` | Entrada del protocolo WebSocket malformada |
| `1009` | `message_too_big` | El mensaje excede el límite configurado |
| `1011` | `internal_error` | Desconexión inesperada de la fuente o fallo del relé |
| `1013` | `try_again_later` | Límite de cola no enviada por dirección excedido |

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

Se recomienda Docker para el aislamiento y las dependencias reproducibles del navegador. Monta solo el directorio de artefactos necesario; la imagen ya incluye Tini, que recoge correctamente los procesos hijos del navegador. En un contenedor reforzado de solo lectura, mantén `/data` montado y proporciona montajes temporales con escritura en `/tmp` y `/tmp/.X11-unix` si pueden existir sesiones con interfaz gráfica.


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
