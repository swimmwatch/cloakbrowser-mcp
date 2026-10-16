---
description: Surface d'outils exposée par CloakBrowser MCP.
icon: material/tools
tags:
  - Outils
  - Guide utilisateur
---

# Outils

`cloakbrowser-mcp` expose les outils upstream de Playwright MCP sans modification. Les noms, descriptions, schémas, annotations et réponses des outils proviennent de `@playwright/mcp`.

## Outils upstream

La surface d'outils navigateur upstream par défaut doit correspondre à la dépendance Playwright MCP fixée. Elle inclut les outils principaux comme la navigation, les snapshots, les clics, la saisie, les captures d'écran, les onglets, les messages console, l'inspection réseau, l'envoi de fichiers, les dialogues et les outils d'évaluation non sûrs.

Pour une référence stable de Playwright MCP `@playwright/mcp@0.0.83`, consultez le test de capacités fixé au commit de ce paquet : [outils par défaut et outils activés par capacité](https://github.com/microsoft/playwright-mcp/blob/f183dad4a52965583e3cc1d59b88cdc279e2e57d/tests/capabilities.spec.ts#L19-L74). La dépendance installée définit la liste actuelle des outils.

Ce projet considère upstream Playwright MCP comme source faisant autorité et ne maintient pas de référence de schéma copiée.

L'ensemble par défaut contient 25 outils upstream, dont `browser_emulate_media`.
`PLAYWRIGHT_MCP_CAPS=devtools` transmet la capacité `devtools` au processus
enfant sans option `--caps` propre au pont ; les outils et schémas upstream qui
en résultent sont transmis sans modification, y compris
`browser_start_recording` et `browser_stop_recording`.

!!! warning "Limitation d'enregistrement avec le binaire public CloakBrowser v146"
    Les outils d’enregistrement sont disponibles, mais le binaire public Chromium 146 sans clé désactive volontairement la liaison Playwright entre la page et l’hôte pour préserver la furtivité. `browser_stop_recording` peut donc renvoyer du code partiel : la navigation est enregistrée, mais les saisies et les clics réussis sont omis. Vérifiez les enregistrements générés avant de les réutiliser.

    La compatibilité activable explicitement est suivie dans [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    La décision sous-jacente concernant la liaison est abordée dans
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) et
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

### Outils WebMCP dynamiques

La prise en charge de WebMCP dépend de la compilation du navigateur et des fonctions activées. Le Playwright MCP installé attend `document.modelContext` ou `navigator.modelContext` avec une méthode `getTools()`. Si WebMCP est nécessaire, utilisez une compilation compatible de CloakBrowser ou `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`.

[La documentation WebMCP de Chrome](https://developer.chrome.com/docs/ai/webmcp) décrit un origin trial dès Chrome 149, un indicateur pour les tests locaux et les limites du mode sans interface. Le numéro de version de Chromium seul ne garantit pas la compatibilité avec l’API attendue par Playwright MCP.

Lorsque Chromium est démarré avec `--enable-features=WebMCP`, Playwright MCP peut ajouter les outils `webmcp_*` fournis par une page tant qu’elle est ouverte. Ces outils sont dynamiques : le pont annonce la prise en charge de `tools.listChanged`, invalide tout le cache de la liste paginée des outils lorsque l’upstream envoie `notifications/tools/list_changed`, puis transmet la notification au client MCP concerné. Les clients doivent écouter cette notification et appeler de nouveau `tools/list`. Un client Streamable HTTP ne reçoit la notification que si le flux de notifications de sa session est ouvert ; même si aucun flux n’était ouvert, le prochain appel à `tools/list` renvoie une liste à jour.

Les outils dynamiques appartiennent uniquement à la session MCP et à la génération actuelle du navigateur CDP géré qui les a découverts. Leurs noms, descriptions, schémas, annotations et sorties sont des contenus de page non fiables, transmis sans réécriture par le pont. Examinez-les avant d’appeler les outils. Définissez `PLAYWRIGHT_MCP_WEBMCP=false` pour désactiver leur collecte. Le pont n’active jamais Chromium WebMCP automatiquement.

## Outils locaux

### `cloakbrowser_binary_info`

Retourne des informations structurées sur le paquet CloakBrowser, la plateforme actuelle, le répertoire de cache, le chemin binaire attendu, l'état d'installation et le resolved executable path utilisé par le pont.

### `cloakbrowser_bridge_info`

Retourne les métadonnées structurées du pont :

- nom et version du serveur MCP ;
- mode d’exécution ;
- paquet et version de Playwright MCP upstream ;
- nombre d’outils upstream ;
- noms des outils locaux propres à Cloak.

L’objet supplémentaire `structuredContent.cdp` indique l’état du CDP géré pour la session appelante :

```json
{ "enabled": false }
```

```json
{
  "enabled": true,
  "state": "ready",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": "http://127.0.0.1:9222/cdp/<capability>",
  "activeConnections": 0
}
```

```json
{
  "enabled": true,
  "state": "unavailable",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": null,
  "activeConnections": 0
}
```

Après le remplacement du navigateur, `generation` augmente et `discoveryUrl` change.
`activeConnections` compte les connexions WebSocket acceptées via le proxy, sans exposer les identités des clients, les identifiants des cibles ni le contenu du protocole. Traitez chaque URL de découverte non nulle comme un justificatif d’accès.

Utilisez l’URL de découverte avec un client compatible CDP :

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

Le CDP géré n’utilise pas le protocole Playwright Server. `chromium.connect()` de Playwright et l’intégration actuelle `PLAYWRIGHT_WS_URL` d’Open WebUI attendent un point de terminaison Playwright Server et ne sont pas compatibles avec cette URL.

Avec la version fixée du client Playwright, il a été vérifié que `browser.close()` sur un navigateur renvoyé par `connectOverCDP()` déconnecte uniquement ce client, tandis que Chromium et la génération actuelle restent prêts. Cette observation concerne ce client et ne garantit pas le comportement des autres bibliothèques CDP. L’envoi direct de la commande CDP `Browser.close` est destructif : il termine la génération Chromium partagée, invalide le justificatif d’accès et affecte les appelants MCP. Coordonnez les opérations MCP et CDP, car le pont ne sérialise pas les navigations, fermetures de pages, saisies ou modifications du stockage qui entrent en conflit.

La liste locale reste limitée à ces deux outils de diagnostic. `SessionSeats` et `getSessionSeats` ne sont pas exposés comme outil MCP, car le point d’entrée public pris en charge de CloakBrowser n’exporte pas cette API.

## Parité

CI construit l'image Docker et exécute `npm run bridge:compare`. Ce script démarre en parallèle l'image officielle Playwright MCP et l'image du pont CloakBrowser, compare la liste des outils upstream et exerce les outils navigateur upstream par défaut sur la même page fixture.

Utilisez `--report` pour écrire un rapport JSON lisible par machine :

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI téléverse ce rapport comme artifact pour les builds Docker et les builds de release.
