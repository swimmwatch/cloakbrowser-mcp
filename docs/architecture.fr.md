---
description: Architecture de passerelle pour CloakBrowser MCP.
icon: material/graph
tags:
  - Project Internals
---

# Architecture

## Durée d'exécution

`cloakbrowser-mcp` est un serveur MCP externe capable d'exposer stdio ou Streamable HTTP. Au démarrage, il :

1. résout ou installe le binaire Chromium de CloakBrowser ;
2. crée un fichier de configuration temporaire pour Playwright MCP ;
3. lance le processus en amont `@playwright/mcp` en tant que processus enfant via stdio ;
4. se connecte à ce processus enfant via le transport client du SDK MCP ;
5. expose un serveur MCP externe au client MCP de l’utilisateur via le transport sélectionné ;
6. transmet la liste des outils en amont et les appels aux outils sans les modifier ;
7. ajoute `cloakbrowser_binary_info` et `cloakbrowser_bridge_info`.

## Pourquoi ce design ?

Le projet en amont Playwright MCP gère déjà les contrats des outils de navigateur et évolue rapidement. Le modèle de passerelle permet de maintenir la taille de ce projet à un niveau réduit et d'éviter de reproduire la logique d'automatisation des navigateurs.

## Propriété gérée CDP { #managed-cdp-ownership }

CDP géré est une deuxième surface de contrôle optionnelle pour la même génération de navigateur :

```text
MCP client -> outer bridge -> upstream Playwright MCP child -> Chromium
                    |                    |                    |-- Playwright pipe
                    |                    `-- generated config `-- internal loopback CDP
                    `-- external capability proxy <--------- CDP client
```

La session MCP possède le bail du port externe, le proxy de capacité, généré en amont
configuration, enfant amont remplaçable, et génération actuelle Chromium. Un CDP
le client ne se connecte jamais directement au point de terminaison de bouclage interne. Bootstrap place un
défi de page de navigateur à usage unique via MCP et le consomme via CDP avant le
la capacité externe est publiée. Le canal de débogage à distance interne de Playwright reste
actif aux côtés du point de terminaison TCP géré par le pont.

Le bail du port externe est stable pour la session MCP, tandis que le processus enfant,
le point de terminaison interne, le numéro de génération et la capacité URL sont remplaçables. Navigateur
la perte invalide la capacité actuelle et ferme ses sockets proxy, mais ne
démarrer un enfant en arrière-plan. Le premier appel ultérieur `browser_*` MCP s'applique à
règle redémarrer-avant-avancer :

1. les appels simultanés du navigateur partagent un redémarrage limité ;
2. l'ancien enfant devient inaccessible et est éliminé ;
3. un enfant de remplacement utilise la même configuration de session et un nouveau port interne ;
4. la propriété et la préparation externe sont vérifiées avant la publication ;
5. Les appels de navigateur en attente sont chacun transmis exactement une fois au remplacement prêt.

Si la préparation échoue, aucun appel de navigateur en attente n’atteint un enfant en amont, aucune capacité
est publié, et un appel ultérieur du navigateur peut démarrer une nouvelle tentative limitée. État du navigateur
tels que les onglets et le stockage en mémoire ne sont pas restaurés lors du remplacement. Outils locaux,
La liste des outils, les lectures de découverte et les déconnexions ordinaires CDP ne déclenchent pas de redémarrage.

Le nettoyage inverse la portée : arrêter l'admission, invalider la capacité, fermer le proxy
les sockets, éliminez l'enfant en amont et le navigateur, fermez l'écouteur externe, puis
libérer la location du port. Cela empêche un ancien URL de se déplacer silencieusement vers un nouveau navigateur.

Les commandes MCP et CDP peuvent s'exécuter simultanément. Le pont n'ajoute pas de transfert entre protocoles
transactions ou déterminer quel appelant possède une page ; les appelants doivent coordonner les actions destructrices ou
opérations conflictuelles.

## Docker

L'image Docker utilise l'image officielle « Playwright MCP » épinglée comme image de base. Le pont est installé sous `/opt/cloakbrowser-mcp`, tandis que le Playwright MCP en amont reste disponible à l'adresse `/app/cli.js`.

## Configuration

Le pont crée un fichier de configuration JSON temporaire contenant les options de lancement de CloakBrowser. Les variables d'environnement en amont `PLAYWRIGHT_MCP_*` sont toujours transmises au MCP Playwright en amont.

## Transports

Le transport par défaut est stdio. Le protocole HTTP streamable est activé explicitement avec `--transport streamable-http` ou `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http`.

Pour stdio, chaque serveur externe gère un processus enfant MCP Playwright en amont et conserve le comportement par défaut du profil du MCP Playwright en amont. Pour Streamable HTTP, chaque session MCP dispose de son propre serveur externe, de son propre processus enfant en amont, d’une configuration générée et d’un état de transport en mémoire. Les sessions HTTP lancent le MCP Playwright en amont avec des profils de navigateur isolés, de sorte que les utilisateurs simultanés ne partagent pas le même profil Chromium persistant et ne se le disputent pas.

Le backend de session stocke uniquement des métadonnées. Le backend intégré est `memory` ; les futurs adaptateurs Redis, Postgres ou SQLite pourront coordonner les métadonnées et les verrous, mais ils ne pourront pas restaurer un processus de navigateur en cours d'exécution en amont après la fermeture du processus serveur qui le gère. La mise à l'échelle horizontale doit utiliser des sessions persistantes indexées par `mcp-session-id`.

Le pont utilise le SDK MCP `StreamableHTTPServerTransport` pour Streamable HTTP. Il n'expose pas le point de terminaison MCP obsolète `SSEServerTransport` ni de point de terminaison hérité `/sse`.
