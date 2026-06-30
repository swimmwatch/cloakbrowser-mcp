---
description: Proceso de lanzamiento del paquete npm de CloakBrowser MCP, la imagen de Docker, el sitio web de documentación, la entrada en el Registro MCP y la implementación en GitHub Pages.
icon: material/tag-check
tags:
  - Project Internals
  - Release
---

# Comunicado

Las versiones se basan en una versión publicada en GitHub cuya etiqueta es un valor semver
precedido por `v`, por ejemplo `v1.2.7`.

El flujo de trabajo unificado `Release` resuelve la etiqueta una vez y, a continuación, pasa la derivada `version`,
`version_tag` y la etiqueta de imagen compatible con Docker a través del empaquetado de npm, los argumentos de compilación de Docker
, las etiquetas de imagen, los metadatos del servidor, los marcadores README y los marcadores de documentación
.

## Configuración del repositorio de GitHub

Configura estos ajustes antes de la primera publicación.

| Area | Required setting |
| --- | --- |
| Actions | Enable GitHub Actions for the repository. |
| Actions token | Allow workflows to request the permissions declared in each workflow. |
| Branch protection | Require `Actionlint`, `CI`, `CodeQL`, and `Dependency Review` before merging to `main`. |
| Pages | Set `Build and deployment -> Source` to `GitHub Actions`. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |
| Environments | Create `npm-production`, `docker-production`, `github-pages`, and `mcp-registry-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

Añade los revisores necesarios a `npm-production`, `docker-production` y
`mcp-registry-production` si las versiones deben requerir aprobación manual tras la
publicación de un GitHub Release. El entorno `github-pages` es utilizado por la
tarea de implementación nativa de GitHub Pages.

## Publicación en npm

El flujo de trabajo de lanzamiento de npm realiza la publicación a través de npm Trusted Publishing con GitHub
Actions OIDC. No utiliza `NPM_TOKEN` para la publicación.

Configura el editor de confianza en npmjs.com con estos valores exactos:

| npm Trusted Publisher field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `swimmwatch/cloakbrowser-mcp` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

El trabajo `npm` se ejecuta en runners alojados en GitHub, utiliza Node.js 24 y mantiene
`id-token: write` para que npm pueda canjear el token OIDC de GitHub Actions por una
credencial de publicación de corta duración. La publicación de confianza de npm requiere la CLI de npm
`>=11.5.1` y Node.js `>=22.14.0`.

Usos editoriales:

```bash
npm publish <tarball> --access public --tag <latest|next>
```

Al publicar a través de Trusted Publishing, npm genera automáticamente la
procedencia de los paquetes públicos procedentes de repositorios públicos. No añadas un
token de publicación de npm de larga duración a este flujo de trabajo.

La versión del paquete se aplica a partir de la etiqueta de lanzamiento de GitHub anterior a `npm pack`
y `npm publish`, y la tarea falla si `package.json` no coincide con la
versión de lanzamiento resuelta.

## Publicación en Docker

Las imágenes de Docker se publican en:

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
docker.io/swimmwatch/cloakbrowser-mcp
```

El trabajo `docker` utiliza el repositorio `GITHUB_TOKEN` con
`packages: write` para GHCR. La publicación en Docker Hub requiere
`DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN` en el `docker-production`
entorno o en los secretos del repositorio.

El flujo de trabajo actualiza la descripción general del repositorio de Docker Hub tras una
subida de imagen correcta. Docker Hub no descarga automáticamente la imagen raíz `README.md` para
este flujo de lanzamiento de GitHub Actions; la vista general específica de Docker Hub se
mantiene en `docs/dockerhub-readme.md`.

Antes de fusionar una release PR, CI valida:

- ejecuta las comprobaciones de TypeScript, lint, formato, compilación, pruebas y cobertura;
- verifica los metadatos y el contenido del paquete npm;
- compila imágenes Docker para `linux/amd64` y `linux/arm64`;
- ejecuta comprobaciones smoke de Docker `--help`;
- compara la imagen `linux/amd64` con el Playwright MCP upstream mediante el script de paridad
  del puente;
- analiza las imágenes Docker con Trivy en busca de vulnerabilidades graves y críticas del sistema operativo y las bibliotecas.

Durante la publicación del lanzamiento, el flujo de trabajo Docker:

- aplica la versión de lanzamiento;
- aplica las actualizaciones de seguridad de Debian disponibles sobre la imagen base de Playwright MCP
  fijada durante la compilación de Docker;
- elimina la carga útil global de npm no utilizada de la imagen de tiempo de ejecución;
- publica la imagen multiplataforma;
- actualiza la vista general de Docker Hub después de que la subida de la imagen se complete correctamente.

La compilación de Docker recibe los argumentos de compilación `RELEASE_VERSION`, `RELEASE_VERSION_TAG` y
`VCS_REF` como argumentos de compilación. El flujo de trabajo también resuelve el resumen de la imagen base MCP de Playwright
de origen y lo pasa como `PLAYWRIGHT_MCP_IMAGE_DIGEST`.

La imagen final almacena los mismos valores que las etiquetas OCI y las variables de entorno de metadatos en tiempo de ejecución.
Las imágenes publicadas incluyen etiquetas para el título, la descripción,
la fuente, la documentación, la versión, la revisión, la licencia, los autores, el proveedor, el nombre de la imagen base,
el resumen de la imagen base y el nombre del servidor MCP.

Trivy es gratuito y de código abierto, y no requiere un token externo para el
análisis de imágenes públicas. Los resultados de SARIF se suben al escáner de código de GitHub cuando
está activado dicho escáner.

Tras la primera publicación, comprueba que el paquete GHCR sea público y esté vinculado a este
repositorio, y comprueba que el repositorio de Docker Hub sea público.

Docker publica un manifiesto multiplataforma para `linux/amd64` y
`linux/arm64`. PR CI ejecuta comprobaciones smoke en ambas plataformas antes de la fusión
y mantiene la comparación de paridad de herramientas del navegador en `linux/amd64`.

## Publicación en el Registro MCP

El trabajo `mcp-registry` publica `server.json` en el
registro oficial en:

```text
https://registry.modelcontextprotocol.io
```

La publicación en el servidor utiliza la acción compuesta de GitHub `MCP Registry Publish`,
la CLI oficial `mcp-publisher` y GitHub Actions OIDC. No abras una solicitud de incorporación de cambios
en `modelcontextprotocol/registry` para incluir este servidor; ese repositorio
exige explícitamente a los autores de paquetes que publiquen con `mcp-publisher`.

El flujo de trabajo no requiere Glama, facturación, una clave de acceso de GitHub (PAT), credenciales de DNS ni
secretos de registro de larga duración. Utiliza:

- `id-token: write` para la autenticación OIDC de GitHub;
- `mcp-publisher login github-oidc`;
- el espacio de nombres existente de GitHub `io.github.swimmwatch/cloakbrowser-mcp`;
- el valor del paquete npm `mcpName` para demostrar la propiedad del paquete npm;
- la etiqueta de la imagen de Docker `io.modelcontextprotocol.server.name` para demostrar la propiedad de la imagen OCI
  .

La tarea del Registro MCP se inicia a partir del mismo evento de lanzamiento de GitHub que npm, Docker
y la publicación de la documentación. Declara `needs: [npm, docker]`, por lo que la publicación en npm y
Docker se completa antes de que comience la publicación en el registro. La implementación de documentación declara
`needs: [docs-build, npm, docker, mcp-registry]`, por lo que GitHub Pages solo se actualiza
después de que npm, Docker y el Registro MCP oficial se hayan publicado correctamente. La acción compuesta
se centra intencionadamente en el registro: valida `server.json` localmente,
la valida con `mcp-publisher`, comprueba si la versión exacta del registro ya está
visible, se autentica con `mcp-publisher login github-oidc`, publica
los metadatos del servidor y verifica la entrada final del registro.

Si se produce un fallo temporal en el registro, vuelve a ejecutar la tarea `mcp-registry` que ha fallado en
la ejecución original de la versión, una vez que las tareas de npm y Docker estén en verde. El disparador manual
`workflow_dispatch` en `Release` está pensado para ejecuciones completas del proceso de lanzamiento con
una etiqueta explícita.

Comprueba la entrada del Registro publicada con:

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch/cloakbrowser-mcp"
npm run registry:check
```

El registro `https://github.com/mcp` de GitHub es una superficie de descubrimiento independiente
y seleccionada. Es obligatorio publicar en el registro oficial de MCP, pero esto no
garantiza una visibilidad inmediata en la página `/mcp` de GitHub. Considera `npm run
registry:check` como una herramienta de verificación de lanzamientos para el registro oficial, npm,
GHCR, Docker Hub y una prueba de visibilidad en GitHub MCP que se realiza en la medida de lo posible. Utiliza `npm run
registry:check:strict` solo cuando la visibilidad en GitHub MCP se convierta en un requisito imprescindible
.

## Lista de comprobación del directorio Glama

La puntuación del directorio de Glama es independiente de las versiones de GitHub y de las publicaciones oficiales en el MCP
Registry. El repositorio incluye `glama.json`, por lo que la
cuenta de administrador `swimmwatch` pueda reclamar o confirmar la propiedad en Glama.

Antes de publicar una versión estable, completa la lista de comprobación gratuita de Glama:

- Sincronizar el servidor desde la interfaz de administración del servidor Glama MCP después de que `glama.json`
  se haya fusionado con `main`;
- abrir
  `https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp/admin/dockerfile`;
- configurar Glama para que compile el archivo Dockerfile de este repositorio e inicie el
  punto de entrada stdio existente sin secretos adicionales;
- mantener el tiempo de ejecución compatible con los valores predeterminados de CloakBrowser: `cloak` motor del navegador
  , modo sin interfaz gráfica, salida stdout y almacenamiento de artefactos `/data`;
- haz clic en «Deploy» y espera a que la prueba de compilación se supere;
- crea y publica una versión de Glama con la misma versión que la de GitHub,
  por ejemplo, `1.2.7`;
- Utiliza la función «Probar en el navegador» de Glama una vez tras la versión para impulsar el
  uso inicial;
- Añade manualmente los servidores relacionados; como mínimo, el servidor oficial de Playwright MCP,
  y, opcionalmente, alternativas de automatización de navegadores estrechamente relacionadas.

No añadas un método de facturación ni un alojamiento de pago de Glama solo para mejorar la
puntuación del directorio. Si Glama exige facturación para un elemento obligatorio de la lista de comprobación, considéralo un
obstáculo para el lanzamiento que requiere una decisión explícita del responsable de mantenimiento.

## Flujos de trabajo de seguridad

El repositorio utiliza herramientas de seguridad gratuitas:

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / npm release | `npm audit --omit=dev --audit-level=high` | PR CI and npm publish job | No external account or token. |

El bloqueo de SHA de las acciones se tiene en cuenta como una futura fase de refuerzo de la seguridad. Los flujos de trabajo actuales utilizan
referencias de acciones con versiones, de modo que las actualizaciones siguen siendo manejables mientras la infraestructura de lanzamiento
aún se encuentra en una fase inicial.

## Publicación de documentación

Los trabajos `docs-build` y `docs-deploy` implementan MkDocs mediante el flujo de implementación nativo de GitHub Pages Actions.
La configuración de Pages del repositorio debe utilizar `GitHub Actions` como
fuente.

El flujo de trabajo genera la documentación en modo estricto, sube el directorio generado `site/`
con `actions/upload-pages-artifact`, y lo implementa con
`actions/deploy-pages` en el entorno `github-pages` solo después de que la publicación de npm,
Docker y el Registro MCP se haya completado correctamente.

La publicación de la documentación también ejecuta el validador SEO tras la compilación de MkDocs.
Los tokens opcionales de verificación para webmasters utilizan herramientas oficiales y gratuitas para webmasters y pueden
proporcionarse como variables del repositorio o como secretos:

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

Las notificaciones opcionales de IndexNow requieren un secreto de repositorio denominado
`INDEXNOW_KEY`. Cuando se configura, el flujo de trabajo publica el archivo de clave necesario y
envía las URL del mapa del sitio generadas tras la implementación en GitHub Pages.

No se deben añadir servicios de indexación de pago, productos publicitarios ni herramientas de análisis de terceros
al proceso de publicación de la documentación sin una decisión explícita
por separado.

## Monitorización en la fase inicial

El flujo de trabajo del monitor de upstream se ejecuta a diario y también se puede iniciar manualmente desde
GitHub Actions. Comprueba los dos canales de distribución de Playwright MCP de upstream:

- Paquete npm: `@playwright/mcp`;
- Imagen de Docker: `mcr.microsoft.com/playwright/mcp`.

Cuando se detecta una versión más reciente del código fuente, el flujo de trabajo crea una incidencia en GitHub
asignada a `swimmwatch`. La incidencia incluye las versiones actuales y más recientes de npm/Docker
, un breve resumen de las notas de la versión de
`microsoft/playwright-mcp`, y enlaces al registro completo de cambios del proyecto original, al
paquete npm y a las etiquetas de Docker.

Ejecuta la misma comprobación localmente con:

```bash
npm run upstream:check
```

## Etiquetas de lanzamiento

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `vX.Y.Z-prerelease`, `X.Y.Z-prerelease` |

## Lista de comprobación

Antes de publicar un comunicado:

- Realiza la fusión solo cuando `Actionlint` y `CI` estén en verde.
- Crea una versión en GitHub a partir de una etiqueta como `v1.2.7`.
- Marca la versión como «prerelease» al publicar una versión de npm `next`.
- Confirma que el «Trusted Publisher» de npm está configurado para `release.yml` y
  `npm-production`.
- Confirma que `npm-production`, `docker-production`, `github-pages` y
  `mcp-registry-production`.
- Comprueba que el análisis de código de GitHub esté habilitado si se necesita visibilidad para la subida de SARIF.
- Comprueba que la visibilidad del paquete GHCR sea pública tras la primera publicación en Docker.
- Comprueba que el servidor Glama se haya sincronizado, se haya probado a través de la página de administración de Dockerfile
  y se haya publicado con la misma versión estable.

`SUPPORT.md` se ha aplazado intencionadamente hasta que el proyecto cuente con una política de soporte estable
que vaya más allá de las incidencias de GitHub y los avisos de seguridad.
