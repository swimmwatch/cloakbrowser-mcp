---
title: "Cargar extensión de Chrome"
description: Carga una extensión de Chrome desempaquetada en CloakBrowser MCP con un perfil persistente.
icon: material/puzzle
tags:
  - User Guide
---

# Cargar extensión de Chrome

Las extensiones de Chrome necesitan un directorio desempaquetado y un perfil persistente.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Usa un array JSON para varios paths, comas o Windows drive-letter paths.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Reinicia el servidor después de cambiar archivos o rutas de extensión.

## Verificar

Use the MCP client to open a page where the extension should be active, then inspect behavior or capture a screenshot.

## Relacionado

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Perfil de inicio de sesión persistente](persistent-login-profile.md)
