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

| Variable | Default | Description |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Bridge transport: `stdio` or `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Streamable HTTP listener protocol: `http` or `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Streamable HTTP bind host. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Streamable HTTP bind port. Use `0` for an ephemeral port in tests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Streamable HTTP endpoint path. `/healthz` and `/readyz` are reserved for probes. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Optional Bearer token required on Streamable HTTP requests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Session metadata backend. Only `memory` is implemented in this release. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Idle TTL for Streamable HTTP sessions. Expired sessions dispose their bridge and upstream child process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Maximum active Streamable HTTP sessions in one process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | TLS certificate PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | TLS private key PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | TLS PFX/PKCS12 path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Passphrase for an encrypted HTTPS key or PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Streamable HTTP operational log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Upstream Playwright MCP proxy server. Used as the GeoIP source when matching is enabled. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Upstream proxy bypass list for hosts that should not use `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Resolves `PLAYWRIGHT_MCP_PROXY_SERVER` GeoIP and matches CloakBrowser timezone and locale fingerprint flags to that proxy location. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Enables CloakBrowser human-like mouse, keyboard, and scroll behavior. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | CloakBrowser human behavior preset: `default` or `careful`. Used only when humanize is enabled. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Répertoire de profil Chromium persistant. Le pont le résout en chemin absolu, le crée s'il manque, vérifie qu'il est accessible en écriture et l'écrit dans le `browser.userDataDir` généré. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | Objet JSON contenant des options de contexte validées. Les champs pris en charge sont listés ci-dessous. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | Tableau JSON ou liste séparée par des virgules de répertoires d'extensions Chrome existants. Nécessite `PLAYWRIGHT_MCP_USER_DATA_DIR`. Utilisez des tableaux JSON pour les chemins Windows ou les chemins contenant des virgules. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## Correspondance via le proxy GeoIP

Définir `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` avec `PLAYWRIGHT_MCP_PROXY_SERVER`
afin de déduire les indicateurs de fuseau horaire, de langue et de paramètres régionaux de CloakBrowser à partir de l’
emplacement du proxy. Le pont conserve le routage du proxy délégué au MCP Playwright
MCP en amont et n’injecte que les indicateurs de lancement résolus `--fingerprint-timezone`, `--lang` et
`--fingerprint-locale` résolus.

Consultez la section [Correspondance de proxy GeoIP](geoip-proxy-matching.md) pour découvrir des exemples de configuration, les métadonnées de proxy HTTP
Streamable en exécution, les cas d'utilisation, les règles de priorité et les limitations.

## Comportement d'entrée humanisé

Définissez `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` pour activer la couche de CloakBrowser imitant les
gestes de la souris, du clavier et du défilement pour les interactions avec les pages. Le pont applique cette modification
via le hook d’initialisation de page de Playwright MCP, de sorte que les schémas des outils de navigation en amont
restent inchangés.

Consultez la section [Comportement d'entrée humanisé](humanized-input-behavior.md) pour découvrir des exemples de configuration,
les métadonnées HTTP Streamable en exécution, les cas d'utilisation et les limitations.

## Extensions Chrome

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

## Métadonnées d'exécution HTTP diffusables en continu

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

`headless` permet d'activer ou de désactiver le mode navigateur sans interface graphique pour cette session. La configuration de
`headless` sur `false` nécessite un environnement d'affichage fonctionnel, en particulier dans les
les déploiements sur Docker ou sur serveur Linux.

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

Pour les modèles de contrôle qualité multi-sites, voir [Correspondance de proxy GeoIP](geoip-proxy-matching.md).
Pour les modèles de réalisme d'interaction, voir [Comportement d'entrée humanisé](humanized-input-behavior.md).

## Options en amont

Le pont transmet les paramètres `PLAYWRIGHT_MCP_*` au MCP Playwright en amont. Cela inclut les options en amont telles que :

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`

Consultez la documentation officielle de Playwright MCP pour découvrir l'ensemble des options disponibles.

## Journalisation

En mode HTTP « Streamable », les journaux de démarrage et de requêtes, lisibles par l'utilisateur, sont écrits sur stdout. En mode « stdio », aucun journal d'exploitation courant n'est généré ; ainsi, la sortie stdout de MCP JSON-RPC reste conforme au protocole. Les échecs fatals au démarrage de l'interface CLI sont toujours consignés sur stderr.

## HTTPS

HTTP Streamable utilise par défaut le protocole HTTP local. Sélectionnez le TLS direct avec `--http-protocol https` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, puis fournissez soit une paire certificat/clé, soit un fichier PFX :

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Pour une exposition externe ou sans bouclage, utilisez le protocole HTTPS avec `--http-auth-token`, ou terminez la connexion TLS au niveau d'un proxy inverse de confiance qui applique également des contrôles d'authentification et d'accès au réseau.

## Sessions HTTP en continu

Chaque session HTTP MCP de Streamable dispose de son propre environnement d’exécution « bridge » et de son propre processus enfant Playwright MCP en amont. Les sessions HTTP exécutent Playwright MCP en amont avec un profil de navigateur isolé, de sorte que les utilisateurs simultanés ne se disputent pas le même profil Chromium persistant. Le backend de session intégré `memory` ne stocke que des métadonnées telles que l'ID de session, les horodatages, la date d'expiration et l'état. L’état du navigateur reste dans le processus enfant en amont actif, et les artefacts sont toujours contrôlés par `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Pour la mise à l'échelle horizontale, exécutez plusieurs répliques de serveur derrière un équilibreur de charge avec des sessions persistantes identifiées par l'en-tête `mcp-session-id`. Les futurs backends Redis, Postgres ou SQLite pourront coordonner les métadonnées et les verrous, mais ils ne pourront pas restaurer une session de navigateur en cours après la fermeture du processus qui la détient.

## Sondes HTTP en continu

Lorsque le pont fonctionne avec `--transport streamable-http`, il expose des points de terminaison de sonde fixes sur le même hôte et le même port que le point de terminaison MCP :

- `GET /healthz` renvoie les métadonnées relatives à l'état du processus : `status`, `version`, `transport`, et `uptimeMs`.
- `GET /readyz` renvoie les métadonnées de disponibilité et la capacité de session : `sessions.active`, `sessions.pending`, `sessions.max` et `sessions.available`.

La fonctionnalité « Readiness » renvoie `200` tant qu'il reste de la capacité de session disponible, et `503` lorsque `active + pending >= max`.
Si `--http-auth-token` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` est configuré, les deux sondes doivent utiliser le même en-tête `Authorization: Bearer ...` que les requêtes MCP. En l'absence de jeton d'authentification, les sondes sont ouvertes sur l'adresse de liaison HTTP configurée.

## Parcours pratiques supplémentaires

Pour choisir entre Playwright MCP amont et ce paquet, consultez la [comparaison](comparison.md). Pour des tâches courtes, utilisez les [recettes](recipes/index.md): profil persistant, extensions, reverse proxy, QA régionale, Claude Desktop, Codex CLI et test smoke CI.
