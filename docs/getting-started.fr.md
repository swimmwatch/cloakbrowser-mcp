---
description: Installez et exécutez CloakBrowser MCP à partir de npm ou de Docker.
icon: material/rocket-launch
tags:
  - User Guide
---

# Pour commencer

Utilisez le paquet npm publié ou l'image Docker. L'installation à partir du code source n'est nécessaire que pour le développement.

Optez pour npm si votre client MCP est déjà installé sur votre machine et que Node.js est disponible. Optez pour Docker si vous souhaitez disposer d'un environnement d'exécution reproductible, avec l'image de base Playwright MCP fournie par le développeur et le cache CloakBrowser préconfiguré au sein du conteneur.

Pour un aperçu rapide des questions courantes relatives à la configuration, consultez la [FAQ](faq.md).

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

Épinglez une version lorsque la reproductibilité est essentielle :

```bash
npx -y {{ project.npm_pin }}
```

Le paquet npm nécessite Node.js 22.13+ dans la branche 22.x, ou Node.js 24+. CloakBrowser télécharge son binaire Chromium lors de la première utilisation, à moins qu'il ne soit déjà en cache.

Utilisez `doctor` pour vérifier l'environnement d'exécution Node.js local, les métadonnées du paquet, la résolution de la CLI MCP de Playwright en amont et les métadonnées du binaire CloakBrowser avant de connecter un client. Cette commande ne lance pas le pont et ne télécharge pas de navigateur.

Le transport par défaut est stdio. Utilisez `--transport streamable-http` lorsque votre client MCP se connecte à un point de terminaison HTTP au lieu de lancer un processus stdio. Le point de terminaison HTTP est par défaut `http://127.0.0.1:3000/mcp`, avec des sondes fixes `GET /healthz` et `GET /readyz` sur le même hôte et le même port. Utilisez `--http-protocol https` avec `--https-cert` et `--https-key` ou `--https-pfx` lorsque le pont doit mettre fin directement à la connexion TLS.
Consultez la [Référence CLI](generated/cli.md) générée pour obtenir la liste complète des indicateurs et les variables d'environnement correspondantes.

## Docker

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker est l'environnement d'exécution le plus reproductible, car l'image est basée sur l'image officielle « Playwright MCP » épinglée et inclut un cache de navigateur CloakBrowser préconfiguré. Les images publiées prennent en charge `linux/amd64` et `linux/arm64`.
Ces mêmes balises sont également publiées sous `ghcr.io/swimmwatch/cloakbrowser-mcp`.

Pour une diffusion HTTP locale via Streamable avec Docker, publiez le port sur la boucle de retour et liez le serveur à l'intérieur du conteneur :

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Pour une connexion HTTPS directe depuis Docker, montez vos fichiers de certificats et sélectionnez HTTPS :

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Le mode HTTP « Streamable » affiche l'URL du point de terminaison MCP en écoute ainsi que les journaux de requêtes sur la sortie standard (stdout). Le mode « stdio » n'émet pas de journaux d'exploitation courants ; la sortie standard (stdout) du MCP JSON-RPC reste ainsi « propre » au niveau du protocole.

Épinglez une version lorsque la reproductibilité est essentielle :

```bash
docker pull {{ project.docker_image }}
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  {{ project.docker_image }}
```

## Configuration du client MCP

La plupart des clients MCP locaux fonctionnent mieux avec stdio et npm :

```bash
npx -y cloakbrowser-mcp@latest
```

Utilisez Docker lorsque vous souhaitez un environnement d'exécution reproductible. Conservez `-i` afin que stdio reste connecté, et ajoutez `--init` pour que les processus enfants du navigateur soient correctement récupérés.

Pour les clients HTTP Streamable, lancez le serveur séparément et configurez l'URL du client comme suit : `http://127.0.0.1:3000/mcp` ou `https://127.0.0.1:3000/mcp`. Si `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` ou `--http-auth-token` est défini, envoyez le même jeton Bearer à `/mcp`, `/healthz` et `/readyz`.

=== « Codex CLI »

    Enregistrer le serveur stdio local :

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Vous pouvez également connecter Codex à un serveur HTTP Streamable déjà en cours d'exécution :

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

=== « Claude Code »

    Enregistrer le serveur stdio local :

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Vous pouvez également connecter Claude Code à un serveur HTTP Streamable déjà en cours d'exécution :

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

=== « Claude Desktop »

    Ajoutez le serveur situé sous `mcpServers` dans `claude_desktop_config.json`, puis redémarrez Claude Desktop :

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

=== « Cursor / Cline » ===

    Ajoutez le serveur à la configuration JSON MCP du client :

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

=== « VS Code »

    Ajoutez le serveur à l'espace de travail `.vscode/mcp.json` ou à votre espace de travail utilisateur `mcp.json` :

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

=== « Continuer »

    Créer `.continue/mcpServers/cloakbrowser-mcp.yaml` :

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

=== « Windsurf / Cascade »

    Dans Windsurf, ouvrez Paramètres > Outils > Paramètres Windsurf > Ajouter un serveur, ou modifiez `~/.codeium/mcp_config.json` :

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

    Pour un serveur HTTP Streamable déjà en cours d'exécution, utilisez `serverUrl` :

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== « Goose »

    Ajoutez une extension MCP personnalisée et utilisez cette commande :

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    Utilisez `cloakbrowser` comme nom d'extension et « stdio » comme mode de transport.

=== « Warp » ===

    Dans Warp, ouvrez Paramètres > Agents > Serveurs MCP, sélectionnez « Ajouter », puis collez :

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

    Pour un serveur HTTP Streamable déjà en cours d'exécution, utilisez une entrée d'URL :

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "url": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== « Docker »

    Utilisez cette option lorsque votre client peut exécuter une commande Docker locale :

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

## Vérifier

Demandez au client MCP de lister les outils. Vous devriez voir les outils de navigateur Playwright MCP en amont, ainsi que :

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Parcours pratiques supplémentaires

Pour choisir entre Playwright MCP amont et ce paquet, consultez la [comparaison](comparison.md). Pour des tâches courtes, utilisez les [recettes](recipes/index.md): profil persistant, extensions, reverse proxy, QA régionale, Claude Desktop, Codex CLI et test smoke CI.
