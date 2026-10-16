---
title: "Cargar extensión de Chrome"
description: Carga una extensión de Chrome desempaquetada en CloakBrowser MCP con un perfil persistente.
icon: material/puzzle
tags:
  - User Guide
---

# Cargar extensión de Chrome

Las extensiones de Chrome necesitan un directorio desempaquetado y un perfil persistente.

Esta receta usa el lanzamiento de extensiones desempaquetadas de CloakBrowser. El modo de conexión mediante la extensión oficial Playwright Extension instalada por separado usa `PLAYWRIGHT_MCP_EXTENSION=true`, un `PLAYWRIGHT_MCP_EXTENSION_TOKEN` de process-level y un persistent profile dedicado. No combines ambos mecanismos.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Usa un array JSON para varios paths, comas o Windows drive-letter paths.

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Reinicia el servidor después de cambiar archivos o rutas de extensión.

## Verificar

Pide al cliente MCP que abra una página donde la extensión deba estar activa y comprueba su comportamiento o toma una captura de pantalla. También puedes llamar a `cloakbrowser_bridge_info` para confirmar la versión esperada del paquete del puente.

## Relacionado

- [Configuración](../configuration.md#chrome-extensions)
- [Docker](../docker.md#chrome-extensions)
- [Perfil de inicio de sesión persistente](persistent-login-profile.md)
