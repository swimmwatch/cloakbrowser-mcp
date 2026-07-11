---
description: Instala y ejecuta CloakBrowser MCP desde npm o Docker.
icon: material/rocket-launch
tags:
  - User Guide
---

# Primeros pasos

Utiliza el paquete npm publicado o la imagen de Docker. Solo es necesario instalarlo desde el código fuente para el desarrollo.

Elige npm si tu cliente MCP ya se ejecuta en tu equipo y tienes Node.js instalado. Elige Docker si deseas un entorno de ejecución reproducible con la imagen base de Playwright MCP de origen y la caché de CloakBrowser preparada dentro del contenedor.

Para obtener una visión general rápida de las preguntas más frecuentes sobre la configuración, consulta las [Preguntas frecuentes](faq.md).

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

Marca una versión cuando la reproducibilidad sea importante:

```bash
npx -y {{ project.npm_pin }}
```

El paquete npm requiere Node.js 22.13+ en la línea 22.x, o Node.js 24+. CloakBrowser descarga su binario de Chromium la primera vez que se utiliza, a menos que ya esté almacenado en la caché.

Utiliza `doctor` para verificar el entorno de ejecución local de Node.js, los metadatos del paquete, la resolución de la CLI de Playwright MCP (upstream) y los metadatos del binario de CloakBrowser antes de conectar un cliente. El comando no inicia el puente ni descarga ningún navegador.

El transporte predeterminado es stdio. Utiliza `--transport streamable-http` cuando tu cliente MCP se conecte a un punto final HTTP en lugar de iniciar un proceso stdio. El punto final HTTP es, por defecto, `http://127.0.0.1:3000/mcp`, con sondas fijas `GET /healthz` y `GET /readyz` en el mismo host y puerto. Utilice `--http-protocol https` junto con `--https-cert` y `--https-key` o `--https-pfx` cuando el puente deba finalizar TLS directamente.
Consulte la [Referencia de la CLI](generated/cli.md) generada para ver la lista completa de indicadores y las variables de entorno correspondientes.

## Docker

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker es el entorno de ejecución más reproducible, ya que la imagen se basa en la imagen oficial fijada de Playwright MCP e incluye una caché del navegador CloakBrowser ya preparada. Las imágenes publicadas admiten `linux/amd64` y `linux/arm64`.
Las mismas etiquetas también se publican en `ghcr.io/swimmwatch/cloakbrowser-mcp`.

Para utilizar Streamable HTTP local con Docker, publica el puerto en el bucle de retorno y vincula el servidor dentro del contenedor:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Para utilizar HTTPS directamente desde Docker, monta los archivos de tu certificado y selecciona HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

El modo HTTP «Streamable» escribe la URL del punto final MCP en escucha y los registros de solicitudes en stdout. El modo stdio no emite registros operativos rutinarios, por lo que el stdout de MCP JSON-RPC se mantiene libre de datos ajenos al protocolo.

Marca una versión cuando la reproducibilidad sea importante:

```bash
docker pull {{ project.docker_image }}
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  {{ project.docker_image }}
```

## Configuración del cliente MCP

La mayoría de los clientes locales de MCP funcionan mejor con stdio y npm:

```bash
npx -y cloakbrowser-mcp@latest
```

Utiliza Docker cuando quieras un entorno de ejecución repetible. Mantén `-i` para que stdio permanezca conectado y añade `--init` para que los procesos secundarios del navegador se recojan correctamente.

En el caso de los clientes HTTP de Streamable, inicia el servidor por separado y configura la URL del cliente como `http://127.0.0.1:3000/mcp` o `https://127.0.0.1:3000/mcp`. Si está configurado `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` o `--http-auth-token`, envía el mismo token Bearer a `/mcp`, `/healthz` y `/readyz`.

=== «Codex CLI»

    Registra el servidor stdio local:

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    O bien, conecta Codex a un servidor HTTP de Streamable que ya esté en funcionamiento:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

=== «Claude Code» ===

    Registra el servidor stdio local:

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    O bien, conecta Claude Code a un servidor HTTP de Streamable que ya esté en funcionamiento:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

=== «Claude Desktop»

    Añade el servidor bajo `mcpServers` en `claude_desktop_config.json` y, a continuación, reinicia Claude Desktop:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== «Cursor / Cline»

    Añade el servidor a la configuración JSON de MCP del cliente:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== «VS Code»

    Añade el servidor al espacio de trabajo `.vscode/mcp.json` o a tu espacio de trabajo de usuario `mcp.json`:

    ```json
    {
      "servers": {
        "cloakbrowser": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== «Continuar»

    Crear `.continue/mcpServers/cloakbrowser-mcp.yaml`:

    ```yaml
    name: CloakBrowser MCP
    version: 0.0.1
    schema: v1
    mcpServers:
      - name: CloakBrowser
        type: stdio
        command: npx
        args:
          - -y
          - cloakbrowser-mcp@latest
    ```

=== «Windsurf / Cascade»

    En Windsurf, abre Ajustes > Herramientas > Ajustes de Windsurf > Añadir servidor, o edita `~/.codeium/mcp_config.json`:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

    Para un servidor HTTP de Streamable que ya esté en funcionamiento, utiliza `serverUrl`:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== «Goose»

    Añade una extensión MCP personalizada y utiliza este comando:

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    Utiliza `cloakbrowser` como nombre de la extensión y «stdio» como transporte.

=== «Warp»

    En Warp, abre «Configuración» > «Agentes» > «Servidores MCP», selecciona «Añadir» y, a continuación, pega lo siguiente:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

    Si el servidor HTTP de Streamable ya está en funcionamiento, utiliza una entrada de URL:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "url": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== «Docker»

    Utiliza esto cuando tu cliente pueda ejecutar un comando local de Docker:

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

## Verificar

Pide al cliente MCP que enumere las herramientas. Deberías ver las herramientas de navegador de Playwright MCP de origen, además de:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Más rutas prácticas

Para elegir entre Playwright MCP upstream y este paquete, consulta la [comparación](comparison.md). Para tareas rápidas, usa las [recetas](recipes/index.md): perfil persistente, extensiones, reverse proxy, QA regional, Claude Desktop, Codex CLI y prueba smoke de CI.
