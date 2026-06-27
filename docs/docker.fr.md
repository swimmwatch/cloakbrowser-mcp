---
description: Exécutez l'image Docker CloakBrowser MCP pour une automatisation reproductible du navigateur Playwright MCP avec CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

L'image publiée correspond à l'environnement d'exécution recommandé pour une utilisation reproductible de MCP.

## Exécuter

```bash
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Les artefacts sont enregistrés dans `/data` au sein du conteneur. Montez ce chemin d'accès pour conserver les captures d'écran, les instantanés, les téléchargements et les données de sortie réseau.

`--init` est recommandé, car l'automatisation des navigateurs peut créer des processus enfants de courte durée. Le processus d'initialisation de Docker se charge de les supprimer proprement.

Les mêmes étiquettes de version sont publiées sur Docker Hub sous la forme `swimmwatch/cloakbrowser-mcp` sur Docker Hub et sous la forme `ghcr.io/swimmwatch/cloakbrowser-mcp` sur GHCR.

## HTTP en continu

Pour une utilisation locale de Streamable via HTTP, publiez le port du conteneur sur la boucle de retour :

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Pour une connexion HTTPS directe depuis le conteneur, montez vos fichiers de certificats et sélectionnez HTTPS :

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

La liaison `127.0.0.1:3000` côté hôte maintient le point de terminaison en local. Si vous publiez Streamable HTTP sur une interface autre qu’une interface de bouclage, utilisez le protocole HTTPS avec authentification, ou placez le serveur derrière un proxy inverse de confiance assurant la terminaison TLS, doté d’une authentification et de contrôles réseau.
Streamable HTTP expose des sondes fixes `GET /healthz` et `GET /readyz` fixes sur le même hôte et le même port. Si `--http-auth-token` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` sont configurées, les sondes nécessitent le même en-tête `Authorization: Bearer ...` que les requêtes MCP.
Consultez la [Référence CLI](generated/cli.md) générée pour connaître tous les indicateurs de transport HTTP et les variables d’environnement.

## Correspondance de proxy GeoIP

Docker utilise les mêmes variables d'environnement de proxy et de GeoIP que npm. Activez la
correspondance de proxy GeoIP lorsque l'assurance qualité régionale a besoin que les empreintes de fuseau horaire, de langue et de
paramètres régionaux de CloakBrowser suivent l'emplacement du proxy configuré :

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Pour les proxys nécessitant une authentification, intégrez les identifiants dans l'URL du proxy et encodez en pourcentage
les caractères spéciaux présents dans le nom d'utilisateur ou le mot de passe.

Lorsque le conteneur exécute Streamable HTTP, les clients peuvent également choisir différents
proxys pour chaque session MCP via les métadonnées `initialize`. Voir
[Correspondance de proxy GeoIP](geoip-proxy-matching.md) pour les métadonnées de proxy en exécution,
les cas d'utilisation multirégionaux et les limitations.

## Valeurs par défaut

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` |

## Configuration du client MCP

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

## Compiler localement

```bash
npm run docker:build
npm run docker:smoke
```

Le fichier Dockerfile utilise l'image officielle Playwright MCP « pinned » comme base d'exécution, applique les mises à jour de sécurité Debian disponibles pendant la compilation, supprime la charge utile npm globale inutilisée de l'image d'exécution et installe le pont sous `/opt/cloakbrowser-mcp`.

Le processus de publication génère les attestations SBOM et de provenance, inclut les balises OCI correspondant à la source, à la révision, à la version, à la licence, au nom de l'image de base et au hachage de l'image de base, et analyse l'image compilée à l'aide de Trivy avant sa publication.
