---
title: "Perfil de inicio de sesión persistente"
description: Reutiliza cookies, local storage, caché y estado de extensiones de CloakBrowser con un directorio de perfil persistente.
icon: material/account-key
tags:
  - User Guide
---

# Perfil de inicio de sesión persistente

Un perfil persistente conserva el estado de inicio de sesión entre sesiones del navegador.

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

Configura el cliente MCP con el mismo comando. No compartas un directorio de perfil entre dos servidores activos.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Usa rutas del contenedor en variables de entorno; la ruta del host solo aparece en el volume mount.

## Verificar

1. Sign in once.
2. Restart with the same PLAYWRIGHT_MCP_USER_DATA_DIR.
3. Confirm the session remains active.

## Relacionado

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Cargar extensión de Chrome](load-chrome-extension.md)
