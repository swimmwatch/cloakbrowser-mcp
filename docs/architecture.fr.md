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

## Docker

L'image Docker utilise l'image officielle « Playwright MCP » épinglée comme image de base. Le pont est installé sous `/opt/cloakbrowser-mcp`, tandis que le Playwright MCP en amont reste disponible à l'adresse `/app/cli.js`.

## Configuration

Le pont crée un fichier de configuration JSON temporaire contenant les options de lancement de CloakBrowser. Les variables d'environnement en amont `PLAYWRIGHT_MCP_*` sont toujours transmises au MCP Playwright en amont.

## Transports

Le transport par défaut est stdio. Le protocole HTTP streamable est activé explicitement avec `--transport streamable-http` ou `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http`.

Pour stdio, chaque serveur externe gère un processus enfant MCP Playwright en amont et conserve le comportement par défaut du profil du MCP Playwright en amont. Pour Streamable HTTP, chaque session MCP dispose de son propre serveur externe, de son propre processus enfant en amont, d’une configuration générée et d’un état de transport en mémoire. Les sessions HTTP lancent le MCP Playwright en amont avec des profils de navigateur isolés, de sorte que les utilisateurs simultanés ne partagent pas le même profil Chromium persistant et ne se le disputent pas.

Le backend de session stocke uniquement des métadonnées. Le backend intégré est `memory` ; les futurs adaptateurs Redis, Postgres ou SQLite pourront coordonner les métadonnées et les verrous, mais ils ne pourront pas restaurer un processus de navigateur en cours d'exécution en amont après la fermeture du processus serveur qui le gère. La mise à l'échelle horizontale doit utiliser des sessions persistantes indexées par `mcp-session-id`.

Le pont utilise le SDK MCP `StreamableHTTPServerTransport` pour Streamable HTTP. Il n'expose pas le point de terminaison MCP obsolète `SSEServerTransport` ni de point de terminaison hérité `/sse`.
