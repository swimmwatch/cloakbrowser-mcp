---
description: Configuration d'exécution du pont Playwright MCP, incluant les sessions Streamable HTTP, les profils persistants, les options de contexte validées, les chemins d'extensions, la correspondance de proxy GeoIP et la saisie humanisée.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Configuration

Utilisez les variables `PLAYWRIGHT_MCP_*` en amont pour le comportement du MCP Playwright. Utilisez `CLOAK_PLAYWRIGHT_MCP_*` uniquement pour le comportement du pont spécifique à Cloak.

Les anciennes variables `CLOAKBROWSER_MCP_*` ne sont plus prises en charge.
La [Référence CLI](generated/cli.md) générée constitue la liste de référence des indicateurs CLI du pont et des variables d'environnement correspondantes.

## Options de pont

| Variable | Valeur par défaut | Description |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Transport du pont : `stdio` ou `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Protocole du serveur d’écoute Streamable HTTP : `http` ou `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Adresse hôte sur laquelle écoute le serveur Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Port sur lequel écoute le serveur Streamable HTTP. Utilisez `0` pour obtenir un port temporaire dans les tests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Chemin du point de terminaison Streamable HTTP. `/healthz` et `/readyz` sont réservés aux sondes. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Jeton Bearer facultatif. Lorsqu’il est défini, les requêtes Streamable HTTP doivent le fournir. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Backend des métadonnées de session. Seul `memory` est implémenté dans cette version. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Durée de validité des sessions Streamable HTTP inactives. À l’expiration, les ressources du pont sont libérées et le processus enfant upstream est arrêté. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Nombre maximal de sessions Streamable HTTP actives dans un processus. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | Chemin du fichier de certificat TLS au format PEM pour Streamable HTTP via HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | Chemin de la clé privée TLS au format PEM pour Streamable HTTP via HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | Chemin du fichier TLS au format PFX/PKCS12 pour Streamable HTTP via HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Phrase secrète de la clé HTTPS chiffrée ou du fichier PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Niveau des journaux opérationnels Streamable HTTP : `trace`, `debug`, `info`, `warn`, `error`, `fatal` ou `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Serveur proxy utilisé par Playwright MCP upstream. Lorsque la correspondance est activée, il sert de source pour les informations GeoIP. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Liste upstream des hôtes qui ne doivent pas utiliser `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Détermine les informations GeoIP de `PLAYWRIGHT_MCP_PROXY_SERVER` et aligne les paramètres d’empreinte de fuseau horaire et de locale de CloakBrowser sur l’emplacement du proxy. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Active les actions de souris, de clavier et de défilement de CloakBrowser qui reproduisent un comportement humain. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | Préréglage du comportement humain de CloakBrowser : `default` ou `careful`. Utilisé uniquement lorsque humanize est activé. |
| `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` | `stable` | Canal de publication du binaire CloakBrowser : `stable` ou `preview`, réservé à Pro. |
| `CLOAKBROWSER_BINARY_PATH` | unset | Chemin vers un exécutable CloakBrowser personnalisé. L’option CLI `--binary-path` est prioritaire. |
| `CLOAKBROWSER_VERSION` | unset | Version épinglée transmise au résolveur de cache CloakBrowser lorsqu’aucun exécutable personnalisé n’est choisi. Une clé valide de l’offre gratuite ignore la version épinglée ; CloakBrowser peut réutiliser un binaire en cache. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` utilise le binaire CloakBrowser. `playwright` ignore le remplacement de l’exécutable propre à Cloak. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Exécute Chromium en mode sans interface graphique. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Répertoire des artefacts pour npm. Docker utilise `/data`. |
| `PLAYWRIGHT_MCP_CODEGEN` | `typescript` | Langage cible pour la génération de code : `typescript`, `python`, `java`, `csharp` ou `none`. Le pont valide la valeur et écrit `codegen` dans sa configuration Playwright MCP générée. |
| `PLAYWRIGHT_MCP_SNAPSHOT_BOXES` | `false` | `true` ou `false` ; inclut la boîte englobante de chaque élément sous la forme `[box=x,y,width,height]` dans les instantanés. Le pont valide la valeur et écrit `snapshot.boxes` dans sa configuration Playwright MCP générée. |
| `PLAYWRIGHT_MCP_TIMEOUT_SETTLE` | `500` | Attente upstream en millisecondes après une action, le temps que le travail déclenché se stabilise. Transmise directement à Playwright MCP. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Délai maximal par défaut des actions, en millisecondes. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Délai maximal par défaut des navigations, en millisecondes. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Dimensions de la zone d’affichage du navigateur au format `WIDTHxHEIGHT`. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Répertoire de profil Chromium persistant. Le pont le résout en chemin absolu, le crée s'il manque, vérifie qu'il est accessible en écriture et l'écrit dans le `browser.userDataDir` généré. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | Objet JSON contenant des options de contexte validées. Les champs pris en charge sont listés ci-dessous. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | Tableau JSON ou liste séparée par des virgules de répertoires d'extensions Chrome existants. Nécessite `PLAYWRIGHT_MCP_USER_DATA_DIR`. Utilisez des tableaux JSON pour les chemins Windows ou les chemins contenant des virgules. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Active le correctif de compatibilité des messages de console. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Ajoute les arguments de lancement furtif par défaut de CloakBrowser. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Arguments Chromium supplémentaires sous forme de liste séparée par des virgules ou de tableau JSON. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Ajoute `--no-sandbox` et désactive le bac à sable de Chromium. |

## CDP géré { #managed-cdp }

L'accès géré au protocole Chrome DevTools (CDP) est une option explicite. Il expose le
même génération de navigateur Chromium contrôlée par MCP via une capacité porteuse
découverte URL. Configurer un pool de ports seul n'active pas CDP.

| option CLI | Variable d'environnement | Par défaut | But |
| --- | --- | --- | --- |
| `--cdp-enabled`, `--no-cdp-enabled` | `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED` | `false` | Définissez la valeur stdio et le paramètre par défaut de session Streamable HTTP. |
| `--cdp-port-range <port\|start-end>` | `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE` | unset | Configurez le pool de ports du proxy externe local au processus. Une session activée loue un port. |
| `--cdp-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_HOST` | `127.0.0.1` | Liez le proxy CDP géré. |
| `--cdp-allow-remote`, `--no-cdp-allow-remote` | `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE` | `false` | Autoriser ou refuser une liaison non loopback. |
| `--cdp-advertised-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST` | non défini | Mettez un hôte concret accessible depuis l'extérieur dans les URL de découverte. Requis pour les liaisons génériques. |
| `--cdp-advertised-scheme <http\|https>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME` | `http` | Publiez les URL `http`/`ws` ou `https`/`wss`. Cela n'active pas TLS. |

Chaque valeur CLI remplace uniquement sa variable d'environnement correspondante. En particulier,
`--no-cdp-enabled` remplace `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=true`, et
`--no-cdp-allow-remote` remplace `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true`.
Une session activée sans pool de ports est rejetée avant que son enfant en amont ne démarre.
Une valeur fausse efficace ne crée aucun écouteur, location de port ou capacité.

Pour stdio, la valeur du processus s'applique directement :

```bash
cloakbrowser-mcp \
  --cdp-enabled \
  --cdp-port-range 9222
```

Pour Streamable HTTP, le booléen plat `cdpEnabled` dans l'authentifié
Les métadonnées `initialize` remplacent les paramètres par défaut du processus pour cette session. En omettant le
le champ hérite de la valeur du processus. Ces exemples choisissent explicitement une session et
un autre dehors :

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "cdpEnabled": true
      }
    }
  }
}
```

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "cdpEnabled": false
      }
    }
  }
}
```

Une session HTTP activée par CDP possède un bail de port externe. Les sessions désactivées ne le possèdent pas
consommer le pool. L'allocation est locale au processus, elle sélectionne le candidat non loué le plus bas,
et échoue cette session immédiatement si le port externe sélectionné est déjà occupé.
Fermez les sessions pour libérer des ports ou configurez une plage plus large lorsque le pool est épuisé.

Récupérez le URL actuel à partir de `cloakbrowser_bridge_info`, puis transmettez-le
`structuredContent.cdp.discoveryUrl` à un client CDP tel que Playwright
`chromium.connectOverCDP()`. Traitez ce URL comme une référence : il inclut un aléatoire
la capacité par génération et devient obsolète après le remplacement du navigateur. CDP géré est
pas un point de terminaison de serveur Playwright. `chromium.connect()` et le Open WebUI actuel
Les flux `PLAYWRIGHT_WS_URL` ne sont pas pris en charge.

`--cdp-advertised-scheme https` publie `https` découverte et `wss` WebSocket URL
seulement. Le pont ne fournit pas TLS pour CDP géré : son écouteur externe et
Chromium hop rester en texte clair HTTP/WebSocket. Un terminateur TLS appartenant à l'opérateur doit
écouter sur le même port loué annoncé, préserver les `Host` et `Origin` annoncés
autorité, et transmettre en avant en tête-à-tête à l'auditeur en texte clair de cette session.

L'activation de CDP commence Chromium lors de l'initialisation de MCP afin que la propriété et l'externe
la préparation peut être vérifiée. Configurez le délai d'initialisation du client MCP à au moins 60
secondes. Lorsque CDP géré est activé, fourni par l'utilisateur
`CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` ne doit pas contenir `--remote-debugging-port`,
`--remote-debugging-address`, ou `--remote-debugging-pipe` (y compris les formes `=`).
Le propre `--remote-debugging-pipe` interne de Playwright reste activé parallèlement à la
point de terminaison TCP de boucle locale géré par le pont.

Voir [Outils](tools.md#cloakbrowser_bridge_info), [Docker](docker.md#managed-cdp),
[Sécurité](security.md#managed-cdp-security), et
[Architecture](architecture.md#managed-cdp-ownership) pour l'état de découverte, le déploiement,
limites et comportement de redémarrage.

## Licence CloakBrowser et connexion GitHub

La configuration de la licence utilise la CLI CloakBrowser en amont ;
`cloakbrowser-mcp` n'ajoute pas de commandes de connexion ou de déconnexion :

```bash
npx -y cloakbrowser@latest login
npx -y cloakbrowser@latest info
npx -y cloakbrowser@latest logout
```

`login` accepte une clé payante ou lance la connexion GitHub afin d'obtenir une
clé de l'offre gratuite. La clé validée est stockée dans
`~/.cloakbrowser/license.key` ; `logout` supprime ce fichier. `info` indique le
niveau de licence actif et, pour les licences Pro, le nombre de sessions
actives.

Vous pouvez aussi définir `CLOAKBROWSER_LICENSE_KEY` dans l'environnement du
serveur MCP. Le pont transmet cette variable au processus enfant en
amont/du navigateur sans la journaliser. Lorsque `CLOAKBROWSER_CACHE_DIR`
pointe vers un cache personnalisé contenant `license.key`, CloakBrowser résout
la clé et le pont ne transmet que cette clé résolue depuis l'environnement
généré du navigateur. Les autres entrées d'environnement générées ne sont pas
copiées.

Si CloakBrowser rejette la clé de licence fournie ou ne peut la valider ni via le serveur de licences ni via la validation en cache, le démarrage échoue avec l’erreur explicite de CloakBrowser. Le pont conserve cette erreur : il ne la masque pas et ne bascule pas silencieusement vers un autre navigateur ou niveau de licence.

CloakBrowser peut réutiliser la validation en cache lorsque son serveur de licences est indisponible. Cela ne garantit pas un démarrage hors ligne : le téléchargement du binaire ou le démarrage du navigateur peuvent encore échouer.

## Canal de publication de CloakBrowser

`CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` sélectionne le canal de publication du binaire CloakBrowser. La valeur par défaut est `stable`. `preview` demande une compilation Preview du navigateur Pro et nécessite une licence Pro. Une version explicitement épinglée avec `CLOAKBROWSER_VERSION` est prioritaire pour les téléchargements sans clé ou avec une clé payante. Une clé valide de l’offre gratuite ignore la version épinglée et peut réutiliser un binaire en cache. Si Preview n’est pas disponible pour la plateforme, CloakBrowser revient à Stable.

Le canal de publication est choisi au démarrage du processus de pont. Il s'applique à toutes les sessions Streamable HTTP et ne peut pas être défini ni remplacé dans les métadonnées initialize. Redémarrez le pont pour le modifier.

## Binaire CloakBrowser personnalisé

`--binary-path <path>` sélectionne un exécutable CloakBrowser personnalisé pour le
processus de pont actuel. `CLOAKBROWSER_BINARY_PATH` fournit le même réglage pour les
déploiements fondés sur l'environnement ; l'option CLI est prioritaire. Le pont
résout le chemin, exige un fichier ordinaire lisible et l'écrit dans
`browser.launchOptions.executablePath` de la configuration Playwright MCP générée.

```bash
npx -y cloakbrowser-mcp@latest --binary-path /opt/cloakbrowser/chrome
```

Le pont ne télécharge ni ne met à jour un exécutable personnalisé. Sans chemin
personnalisé, `CLOAKBROWSER_VERSION` peut plutôt fixer la version du binaire géré par
CloakBrowser.

Pour Streamable HTTP, le binaire sélectionné appartient au processus de pont et est
utilisé par toutes les sessions MCP qu'il crée. Les métadonnées `initialize` ne
peuvent pas sélectionner ni remplacer un chemin exécutable ; lancez des processus
distincts pour des binaires différents.

Si la compilation choisie fournit `document.modelContext` ou `navigator.modelContext` avec une méthode `getTools()`, upstream Playwright MCP peut ajouter des outils `webmcp_<page-tool>` après un instantané de la page. Il envoie `tools/list_changed` ; le pont transmet la notification et la liste actualisée. La page définit le nom et le schéma de chaque outil dynamique.

## Correspondance via le proxy GeoIP

Définissez `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` avec
`PLAYWRIGHT_MCP_PROXY_SERVER` afin de déduire les indicateurs de fuseau horaire,
de langue et de paramètres régionaux de CloakBrowser à partir de l'emplacement
de sortie du proxy. CloakBrowser sélectionne l'authentification native intégrée
à l'URL pour les binaires compatibles et conserve l'objet proxy de Playwright
comme solution de repli pour les anciens binaires.

Consultez la section [Correspondance de proxy GeoIP](geoip-proxy-matching.md) pour découvrir des exemples de configuration, les métadonnées de proxy HTTP
Streamable en exécution, les cas d'utilisation, les règles de priorité et les limitations.

Pour une procédure concise, voir [QA régionale via un proxy](recipes/regional-qa-through-proxy.md).

## Comportement d'entrée humanisé

Définissez `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` pour activer la couche de CloakBrowser imitant les
gestes de la souris, du clavier et du défilement pour les interactions avec les pages. Le pont applique cette modification
via le hook d’initialisation de page de Playwright MCP, de sorte que les schémas des outils de navigation en amont
restent inchangés.

Consultez la section [Comportement d'entrée humanisé](humanized-input-behavior.md) pour découvrir des exemples de configuration,
les métadonnées HTTP Streamable en exécution, les cas d'utilisation et les limitations.

## Extensions Chrome { #chrome-extensions }

Les extensions Chrome sont chargées au démarrage du navigateur. Configurez-les
donc avant de démarrer le pont ou avant de créer une session Streamable HTTP.
Les extensions doivent être des répertoires décompressés et nécessitent un
profil persistant :

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Pour Streamable HTTP, transmettez les répertoires du profil et de l'extension
dans les métadonnées `initialize` :

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "userDataDir": "/absolute/path/to/profile",
        "extensionPaths": ["/absolute/path/to/my-extension"]
      }
    }
  }
}
```

Redémarrez le pont ou créez une nouvelle session HTTP après avoir modifié des
fichiers ou chemins d'extensions. Utilisez un tableau JSON pour
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` lorsque les chemins contiennent des
virgules, lors du passage de plusieurs extensions ou lors de l'utilisation de
chemins Windows avec lettres de lecteur.

Pour une configuration courte à copier, voir [Charger une extension Chrome](recipes/load-chrome-extension.md).

## Mode de connexion Playwright Extension { #playwright-extension-connection-mode }

Le mode de connexion Playwright Extension est distinct du chargement d’une extension décompressée avec `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`. Il se connecte via l’extension officielle Playwright Extension déjà installée dans un profil Chrome ou Edge ; le pont n’installe pas cette extension.

Pour stdio, configurez l’environnement du processus :

```bash
PLAYWRIGHT_MCP_EXTENSION=true \
  PLAYWRIGHT_MCP_EXTENSION_TOKEN='<secret-from-the-extension>' \
  PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/playwright-extension" \
  PLAYWRIGHT_MCP_PROFILE_DIR_NAME='Profile 1' \
  npx -y cloakbrowser-mcp@latest
```

Pour Streamable HTTP, `extensionMode` et `profileDirName` dans les métadonnées `initialize` remplacent les valeurs correspondantes du processus. `userDataDir` est également propre à chaque session. Le jeton reste accepté uniquement via l’environnement du processus :

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "extensionMode": true,
        "profileDirName": "Profile 1",
        "userDataDir": "/absolute/path/to/profile"
      }
    }
  }
}
```

Le mode extension nécessite un jeton non vide et un profil persistant. Les sessions HTTP simultanées en mode extension doivent utiliser des valeurs `userDataDir` différentes. Avant de démarrer le processus enfant upstream, le pont rejette les points de terminaison CDP gérés ou externes, les points de terminaison de navigateurs distants, les configurations de lancement sans interface ou isolées, les options de proxy et GeoIP, l’humanisation, les modifications du contexte, les `extensionPaths` d’extensions décompressées et les options de lancement CloakBrowser explicitement fournies. La vérification de bout en bout d’une connexion réussie est manuelle, car l’extension officielle Playwright Extension doit déjà être installée dans le profil de navigateur choisi.

## Métadonnées d'exécution HTTP diffusables en continu { #streamable-http-runtime-metadata }

Les clients HTTP prenant en charge le streaming peuvent choisir certaines options d'exécution pour chaque session MCP en ajoutant
des métadonnées spécifiques au pont à la requête `initialize` :

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true,
        "headless": false,
        "extensionMode": false,
        "profileDirName": "Profile 1",
        "humanize": true,
        "humanPreset": "careful",
        "userDataDir": "/absolute/path/to/profile",
        "contextOptions": {
          "viewport": { "width": 1280, "height": 720 },
          "locale": "en-US",
          "timezoneId": "America/New_York"
        },
        "extensionPaths": ["/absolute/path/to/extension"]
      }
    }
  }
}
```

`proxyServer` remplace `PLAYWRIGHT_MCP_PROXY_SERVER` pour cette session HTTP.
`proxyBypass` remplace `PLAYWRIGHT_MCP_PROXY_BYPASS` uniquement lorsque `proxyServer` est
présent. `geoipProxyMatch` permet d’activer ou de désactiver la correspondance GeoIP pour cette session
sans redémarrer le serveur MCP. Les sessions existantes conservent leur proxy de démarrage ;
créez une nouvelle session HTTP pour changer d’emplacement.

`humanize` permet d'activer ou de désactiver le comportement d'entrée humanisé pour cette session
sans modifier les autres sessions. `humanPreset` permet de sélectionner `default` ou `careful`
pour cette session, mais n’active pas en soi le comportement humanisé. Les
sessions existantes conservent le comportement enregistré pendant `initialize`.

`headless` peut activer ou désactiver le mode sans interface du navigateur pour cette session. Dans l’image Docker, définir `headless` à `false` démarre à la demande un affichage virtuel privé au conteneur. En dehors de cette image, une session avec interface nécessite toujours un environnement d’affichage utilisable.

`extensionMode` et `profileDirName` remplacent `PLAYWRIGHT_MCP_EXTENSION` et `PLAYWRIGHT_MCP_PROFILE_DIR_NAME` pour cette session. `PLAYWRIGHT_MCP_EXTENSION_TOKEN` n’est jamais accepté dans les métadonnées.

`userDataDir` active un profil Chromium persistant pour cette session et
remplace `PLAYWRIGHT_MCP_USER_DATA_DIR`. Le pont résout le répertoire en chemin
absolu natif de la plateforme, le crée s'il manque, vérifie qu'il est accessible
en écriture et l'écrit dans le `browser.userDataDir` généré. Un profil
persistant désactive le profil isolé Streamable HTTP par défaut pour cette
session. Le pont rejette les répertoires de profil actifs en double dans un même
processus ; les conflits de profil entre processus restent des erreurs
Chromium/Playwright.

`contextOptions` sont validées et fusionnées superficiellement au-dessus de
`CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` ; les objets imbriqués remplacent des
valeurs entières. Les champs pris en charge sont `userAgent`, `viewport`,
`locale`, `timezoneId`, `colorScheme`, `permissions`, `geolocation`,
`extraHTTPHeaders`, `httpCredentials`, `ignoreHTTPSErrors`, `offline`,
`deviceScaleFactor`, `isMobile` et `hasTouch`. Le passage arbitraire de
`BrowserContextOptions` n'est pas pris en charge dans cette version.

`extensionPaths` doivent pointer vers des répertoires existants et nécessitent
un `userDataDir` persistant. Le pont résout les chemins d'extensions en chemins
absolus natifs de la plateforme, les transmet à CloakBrowser et écrit les
arguments Chromium générés `--load-extension` et `--disable-extensions-except`
dans la configuration Playwright MCP générée.

Les identifiants de proxy HTTP authentifiés peuvent être intégrés dans `proxyServer`, par
exemple `http://user:pass@proxy.example:8080`. Encodez en pourcentage les caractères d’identification
ayant une signification URL, tels que `@`, `:`, `/`, `?`, `#`, et `%`.

Sur les binaires CloakBrowser compatibles, les proxys HTTP authentifiés utilisent
l'authentification native intégrée à l'URL et le pont supprime l'objet proxy
Playwright en double. Les anciens binaires conservent l'objet proxy Playwright
comme solution de repli pour la compatibilité.

Pour les modèles de contrôle qualité multi-sites, voir [Correspondance de proxy GeoIP](geoip-proxy-matching.md).
Pour les modèles de réalisme d'interaction, voir [Comportement d'entrée humanisé](humanized-input-behavior.md).

Pour réutiliser une connexion et configurer les extensions, voir [Profil de connexion persistant](recipes/persistent-login-profile.md) et [Charger une extension Chrome](recipes/load-chrome-extension.md).

## Options en amont

Le pont transmet les paramètres `PLAYWRIGHT_MCP_*` au MCP Playwright en amont. Cela inclut les options en amont telles que :

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_FILE_PATHS`
- `PLAYWRIGHT_MCP_IDLE_TIMEOUT`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_PROFILE_DIR_NAME`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`
- `PLAYWRIGHT_MCP_WEBMCP`

Consultez la documentation officielle de Playwright MCP pour découvrir l'ensemble des options disponibles.

`PLAYWRIGHT_MCP_CAPS=devtools` est hérité par le processus enfant upstream et
active les outils contrôlés par cette capacité sans option `--caps` propre au
pont.

## Journalisation

En mode HTTP « Streamable », les journaux de démarrage et de requêtes, lisibles par l'utilisateur, sont écrits sur stdout. En mode « stdio », aucun journal d'exploitation courant n'est généré ; ainsi, la sortie stdout de MCP JSON-RPC reste conforme au protocole. Les échecs fatals au démarrage de l'interface CLI sont toujours consignés sur stderr.

## HTTPS { #https }

HTTP Streamable utilise par défaut le protocole HTTP local. Sélectionnez le TLS direct avec `--http-protocol https` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, puis fournissez soit une paire certificat/clé, soit un fichier PFX :

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Pour une exposition externe ou sans bouclage, utilisez le protocole HTTPS avec `--http-auth-token`, ou terminez la connexion TLS au niveau d'un proxy inverse de confiance qui applique également des contrôles d'authentification et d'accès au réseau.

## Sessions HTTP en continu

Chaque session Streamable HTTP MCP possède son propre environnement d’exécution du pont et son propre processus enfant upstream Playwright MCP. Les sessions HTTP utilisent par défaut des profils isolés, sauf si un profil persistant est configuré. Un profil persistant explicite est verrouillé ; les sessions simultanées nécessitent des répertoires de profil différents. Le backend intégré `memory` ne conserve que les métadonnées : ID de session, horodatages, expiration et état. L’état du navigateur reste dans le processus enfant upstream actif, et les artefacts sont contrôlés par `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Pour la mise à l'échelle horizontale, exécutez plusieurs répliques de serveur derrière un équilibreur de charge avec des sessions persistantes identifiées par l'en-tête `mcp-session-id`. Les futurs backends Redis, Postgres ou SQLite pourront coordonner les métadonnées et les verrous, mais ils ne pourront pas restaurer une session de navigateur en cours après la fermeture du processus qui la détient.

## Sondes HTTP en continu

Lorsque le pont fonctionne avec `--transport streamable-http`, il expose des points de terminaison de sonde fixes sur le même hôte et le même port que le point de terminaison MCP :

- `GET /healthz` renvoie les métadonnées relatives à l'état du processus : `status`, `version`, `transport`, et `uptimeMs`.
- `GET /readyz` renvoie les métadonnées de disponibilité et la capacité de session : `sessions.active`, `sessions.pending`, `sessions.max` et `sessions.available`.

La fonctionnalité « Readiness » renvoie `200` tant qu'il reste de la capacité de session disponible, et `503` lorsque `active + pending >= max`.
Si `--http-auth-token` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` est configuré, les deux sondes doivent utiliser le même en-tête `Authorization: Bearer ...` que les requêtes MCP. En l'absence de jeton d'authentification, les sondes sont ouvertes sur l'adresse de liaison HTTP configurée.

## Parcours pratiques supplémentaires

Pour choisir entre Playwright MCP amont et ce paquet, consultez la [comparaison](comparison.md). Pour des tâches courtes, utilisez les [recettes](recipes/index.md): profil persistant, extensions, reverse proxy, QA régionale, Claude Desktop, Codex CLI et test smoke CI.
