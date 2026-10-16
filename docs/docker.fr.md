---
description: Exécutez l'image Docker CloakBrowser MCP pour une automatisation reproductible du navigateur Playwright MCP avec des profils /data persistants, des montages d'extensions et CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

L'image publiée correspond à l'environnement d'exécution recommandé pour une utilisation reproductible de MCP.

Pour déployer rapidement un serveur HTTP déjà actif derrière TLS et une authentification, consultez la [recette Docker Streamable HTTP avec proxy inverse](recipes/docker-streamable-http-reverse-proxy.md).

## Exécuter

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Les artefacts sont enregistrés dans `/data` au sein du conteneur. Montez ce chemin d'accès pour conserver les captures d'écran, les instantanés, les téléchargements et les données de sortie réseau.

L’image exécute déjà Tini comme PID 1 et sous-reaper, donc les commandes normales ne nécessitent pas de processus init Docker supplémentaire.

Les mêmes étiquettes de version sont publiées sur Docker Hub sous la forme `swimmwatch/cloakbrowser-mcp` sur Docker Hub et sous la forme `ghcr.io/swimmwatch/cloakbrowser-mcp` sur GHCR.

## Sessions avec interface et affichage virtuel { #headed-sessions-and-virtual-display }

L’image utilise par défaut `PLAYWRIGHT_MCP_HEADLESS=true` ; les sessions sans interface ne démarrent pas Xvfb. Lorsqu’une session demande `headless: false`, le lanceur démarre à la demande un affichage Xvfb privé au conteneur, attend qu’il soit utilisable et le conserve jusqu’à l’arrêt du conteneur. Les sessions HTTP simultanées avec interface partagent cet affichage, tandis que leurs contextes de navigateur Playwright, pages, profils et artefacts restent isolés.

Pour une session stdio avec interface, définissez la variable Playwright MCP standard :

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Ce n’est ni un bureau visible ni un service de diffusion d’interface graphique : l’image ne fournit ni VNC, ni noVNC, ni RDP, ni accès au X11 de l’hôte, ni capture de l’affichage. Ne considérez pas le focus X11 natif, le presse-papiers ou la capture de l’affichage comme des frontières d’isolation entre locataires. Le lanceur arrête l’affichage pendant l’arrêt du conteneur. Un échec au démarrage ou la fin de la CLI MCP arrête le conteneur au lieu de laisser un pont utilisable.

En dehors de cette image, un navigateur avec interface nécessite toujours un environnement d’affichage utilisable. Définissez `PLAYWRIGHT_MCP_HEADLESS=true` lorsqu’aucun affichage n’est disponible.

## Santé du conteneur et environnement restreint { #container-health-and-restricted-runtime }

Le `HEALTHCHECK` Docker utilise un socket Unix privé et vérifie activement que la boucle d’événements de la CLI MCP répond. Si Xvfb a été démarré, il vérifie aussi l’affichage X11. Un conteneur sans interface pour lequel aucun affichage n’a jamais été demandé reste sain. Le démarrage, l’arrêt ou une défaillance de l’affichage entraîne un état non sain. La sonde de réponse X11 est limitée à 1 seconde, la réponse CLI à 750 millisecondes et la requête privée de santé à 2.5 secondes. Docker termine une commande de santé après 3 secondes. Avec un intervalle Docker de 2 secondes et deux nouvelles tentatives, les transitions d’état dépendent de la planification Docker et ne constituent pas un objectif de niveau de service pour la disponibilité. Cette vérification est distincte des points de terminaison HTTP publics `/healthz` et `/readyz` et n’envoie jamais de trafic via MCP stdio. Elle ne prouve pas qu’un navigateur, une session MCP ou un site distant est utilisable ; le redémarrage et la récupération relèvent d’un orchestrateur externe.

Le lanceur accorde à chaque processus enfant jusqu’à 8 secondes pour se terminer après `SIGTERM`, puis jusqu’à 2 secondes après `SIGKILL`. Le délai d’arrêt Docker doit permettre l’arrêt successif de la CLI et de Xvfb. L’image s’exécute avec l’utilisateur `node`, sans privilèges root, et accepte un système de fichiers racine en lecture seule. Gardez `/data` monté pour les artefacts et fournissez des montages temporaires accessibles en écriture pour `/tmp` et `/tmp/.X11-unix` si des sessions avec interface sont possibles. Le socket de santé est accessible uniquement à son propriétaire (`0600`). Le socket X11 interne au conteneur est partagé entre le processus `node` et Xvfb : ce n’est donc pas une frontière d’isolation entre locataires. Ne montez aucun de ces sockets depuis l’hôte et ne les partagez pas entre conteneurs.

## Profils persistants { #persistent-profiles }

Docker n'active pas de profil de navigateur persistant par défaut. Utilisez le
volume existant `/data` comme racine de persistance lorsque vous voulez que les
cookies, le stockage local, le cache ou l'état des extensions survivent aux
redémarrages du conteneur :

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Les variables d'environnement dans Docker doivent utiliser des chemins de
conteneur comme `/data/profiles/default`, et non des chemins hôte. Le pont crée
le répertoire de profil s'il manque, vérifie qu'il est accessible en écriture,
écrit le chemin du conteneur dans la configuration Playwright MCP générée et
rejette les répertoires de profil actifs en double dans un même processus
serveur.

## Cache de licence CloakBrowser

L'image stocke les binaires CloakBrowser, l'état de la licence et le cache de
validation dans `/home/node/.cloakbrowser`. Montez-y un volume nommé pour
conserver une connexion GitHub gratuite ou Pro lors du remplacement du
conteneur :

```bash
docker volume create cloakbrowser-cache

docker run --rm -it \
  --entrypoint node \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  swimmwatch/cloakbrowser-mcp:latest \
  /opt/cloakbrowser-mcp/node_modules/cloakbrowser/dist/cli.js login

docker run --rm -i \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Utilisez le même volume avec la commande en amont `info` ou `logout` pour
examiner ou supprimer la connexion enregistrée. Vous pouvez aussi injecter
`CLOAKBROWSER_LICENSE_KEY` par l'intermédiaire de la gestion des secrets du
conteneur. Ne placez pas de clés de licence dans les couches d'image, les
fichiers Compose suivis par le contrôle de version ou les sorties de commande
capturées comme preuve de build.

## Binaire CloakBrowser personnalisé

Montez un exécutable de navigateur compatible dans le conteneur et transmettez son
chemin interne avec `--binary-path` (ou `CLOAKBROWSER_BINARY_PATH`) :

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/custom-chrome:/browser/chrome:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --binary-path /browser/chrome
```

Le fichier doit être un exécutable Linux lisible compatible avec l’architecture CPU
de l’image, et ses bibliothèques doivent être disponibles dans le conteneur. Le
chemin s’applique à toutes les sessions Streamable HTTP du conteneur ; utilisez des
conteneurs distincts pour des binaires de navigateur différents.

## Extensions Chrome { #chrome-extensions }

Les extensions Chrome nécessitent un profil persistant et doivent être montées
séparément. Utilisez des chemins de conteneur dans les variables
d'environnement, pas des chemins hôte. Le montage de l'extension peut être en
lecture seule :

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Utilisez un tableau JSON pour `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` lorsqu'un
chemin contient des virgules ou lors du passage de plusieurs répertoires
d'extensions. Redémarrez le conteneur après avoir modifié des fichiers ou
chemins d'extensions.

Le mode de connexion Playwright Extension est distinct du montage d'une extension décompressée présenté ci-dessus. Il exige l'extension officielle dans un persistent Chrome/Edge profile et `PLAYWRIGHT_MCP_EXTENSION_TOKEN`. Montez chaque profile dans un writable path séparé, injectez le token via un gestionnaire de secrets et ne combinez pas `PLAYWRIGHT_MCP_EXTENSION=true` avec `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`.

## HTTP en continu { #streamable-http }

Pour une utilisation locale de Streamable via HTTP, publiez le port du conteneur sur la boucle de retour :

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Pour des sessions HTTP avec interface, définissez `PLAYWRIGHT_MCP_HEADLESS=false` dans le conteneur. Les requêtes `initialize` individuelles peuvent toujours sélectionner le mode sans interface via les métadonnées MCP prises en charge.

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Pour une connexion HTTPS directe depuis le conteneur, montez vos fichiers de certificats et sélectionnez HTTPS :

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

La liaison `127.0.0.1:3000` côté hôte maintient le point de terminaison en local. Si vous publiez Streamable HTTP sur une interface autre qu’une interface de bouclage, utilisez le protocole HTTPS avec authentification, ou placez le serveur derrière un proxy inverse de confiance assurant la terminaison TLS, doté d’une authentification et de contrôles réseau.
Streamable HTTP expose des sondes fixes `GET /healthz` et `GET /readyz` fixes sur le même hôte et le même port. Si `--http-auth-token` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` sont configurées, les sondes nécessitent le même en-tête `Authorization: Bearer ...` que les requêtes MCP.
Consultez la [Référence CLI](generated/cli.md) générée pour connaître tous les indicateurs de transport HTTP et les variables d’environnement.

## Géré CDP { #managed-cdp }

Publiez la plage gérée CDP configurée un à un. Cet exemple stdio en active un
session et maintient chaque port hôte lié à la boucle locale :

```bash
docker run --rm -i \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --cdp-enabled \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

`--cdp-host 0.0.0.0` est requis pour le transfert de port Docker, donc l'explicite
L'adhésion `--cdp-allow-remote` et le `--cdp-advertised-host` concret sont également requis.
Ne remappez pas la plage vers des numéros de ports hôtes différents : les URL de découverte contiennent le
Le port loué et chaque port publié doivent être acheminés de manière un à un vers leur session propriétaire.

Pour Streamable HTTP multi-session, configurez et publiez le pool sans le paramétrer
processus par défaut si les clients doivent opter individuellement :

```bash
docker run --rm \
  -p 127.0.0.1:3000:3000 \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http \
  --http-host 0.0.0.0 \
  --http-port 3000 \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

Une demande `initialize` authentifiée avec des baux `cdpEnabled: true` en publie un
port. Une valeur omise hérite de la valeur par défaut du processus, tandis que `cdpEnabled: false`
choisit explicitement de se désinscrire et ne consomme aucun port CDP. L'épuisement du pool rejette seulement un nouveau
Session activée CDP ; elle ne réduit pas la capacité des sessions désactivées.

Lisez le URL portant des capacités depuis `cloakbrowser_bridge_info`. Ne le mettez pas dedans
journaux de conteneur ou vérifications de l’état. Connectez-vous avec un CDP API tel que
`chromium.connectOverCDP()` ; le URL n'est pas compatible avec Playwright
`chromium.connect()` ou le flux Open WebUI actuel.

`--cdp-advertised-scheme https` change les URL publiées en `https`/`wss`, mais le
Le pont ne fournit pas TLS pour CDP géré. Utilisez un terminateur TLS appartenant à l'opérateur qui
occupe le même port annoncé dans l'espace de noms réseau externe, préserve
`Host`/`Origin`, et transfère un à un vers l'écouteur du pont en texte clair. Le
Le pont vers Chromium hop reste également le trafic de bouclage en texte clair.

## Correspondance de proxy GeoIP { #geoip-proxy-matching }

Docker utilise les mêmes variables d'environnement de proxy et de GeoIP que npm. Activez la
correspondance de proxy GeoIP lorsque l'assurance qualité régionale a besoin que les empreintes de fuseau horaire, de langue et de
paramètres régionaux de CloakBrowser suivent l'emplacement du proxy configuré :

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Pour les proxys nécessitant une authentification, intégrez les identifiants dans l'URL du proxy et encodez en pourcentage
les caractères spéciaux présents dans le nom d'utilisateur ou le mot de passe.

Les binaires CloakBrowser compatibles utilisent l'authentification native du
proxy intégrée à l'URL ; les anciens binaires se replient sur l'objet proxy
Playwright.

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
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset |
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
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset |
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
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Compiler localement { #build-locally }

```bash
npm run docker:build
npm run docker:smoke
```

Le fichier Dockerfile utilise l'image officielle Playwright MCP « pinned » comme base d'exécution, applique les mises à jour de sécurité Debian disponibles pendant la compilation, supprime la charge utile npm globale inutilisée de l'image d'exécution et installe le pont sous `/opt/cloakbrowser-mcp`.

Le processus de publication génère les attestations SBOM et de provenance, inclut les balises OCI correspondant à la source, à la révision, à la version, à la licence, au nom de l'image de base et au hachage de l'image de base, et analyse l'image compilée à l'aide de Trivy avant sa publication.

## Parcours pratiques supplémentaires

Pour choisir entre Playwright MCP amont et ce paquet, consultez la [comparaison](comparison.md). Pour des tâches courtes, utilisez les [recettes](recipes/index.md): profil persistant, extensions, reverse proxy, QA régionale, Claude Desktop, Codex CLI et test smoke CI.
