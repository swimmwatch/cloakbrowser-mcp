---
title: "Charger une extension Chrome"
description: Chargez une extension Chrome décompressée dans CloakBrowser MCP avec un profil persistant.
icon: material/puzzle
tags:
  - User Guide
---

# Charger une extension Chrome

Les extensions Chrome nécessitent un répertoire décompressé et un profil persistant.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Utilisez un JSON array pour plusieurs paths, virgules ou Windows drive-letter paths.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Redémarrez le serveur après modification des fichiers ou chemins d’extension.

## Vérifier

Use the MCP client to open a page where the extension should be active, then inspect behavior or capture a screenshot.

## Liens associés

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Profil de connexion persistant](persistent-login-profile.md)
