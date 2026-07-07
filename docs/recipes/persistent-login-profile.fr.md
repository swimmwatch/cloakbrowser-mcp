---
title: "Profil de connexion persistant"
description: Réutilisez cookies, local storage, cache et état des extensions CloakBrowser avec un répertoire de profil persistant.
icon: material/account-key
tags:
  - User Guide
---

# Profil de connexion persistant

Un profil persistant conserve l’état de connexion entre les sessions navigateur.

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

Configurez le client MCP avec la même commande. Ne partagez pas un répertoire de profil entre deux serveurs actifs.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Utilisez des chemins de conteneur dans les variables d’environnement ; le chemin hôte apparaît seulement dans le volume mount.

## Vérifier

1. Sign in once.
2. Restart with the same PLAYWRIGHT_MCP_USER_DATA_DIR.
3. Confirm the session remains active.

## Liens associés

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Charger une extension Chrome](load-chrome-extension.md)
