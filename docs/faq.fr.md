---
description: Foire aux questions concernant l'installation de CloakBrowser MCP, l'utilisation de Docker, la parité avec Playwright MCP et la sécurité.
icon: material/help-circle
tags:
  - User Guide
---

# FAQ

## Qu'est-ce que CloakBrowser MCP ?

CloakBrowser MCP est un serveur [Model Context Protocol](https://modelcontextprotocol.io/) destiné à l'automatisation des navigateurs via stdio ou Streamable HTTP. Il s’exécute en amont de [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) et redirige la configuration de lancement du navigateur Playwright MCP vers le binaire Chromium [CloakBrowser](https://github.com/CloakHQ/CloakBrowser).

## En quoi diffère-t-il du MCP Playwright en amont ?

Le serveur MCP Playwright en amont gère les schémas, les descriptions et les réponses des outils de navigation. Le MCP CloakBrowser conserve ces outils tels quels et n'ajoute que deux outils d'introspection locaux : `cloakbrowser_binary_info` et `cloakbrowser_bridge_info`.

## Dois-je l'installer via npm ou Docker ?

Utilisez npm si votre client MCP est déjà installé sur votre machine et que vous disposez de Node.js 22.12 ou d'une version plus récente. Utilisez Docker si vous souhaitez disposer d'une image Playwright basée sur MCP reproductible, avec le cache CloakBrowser déjà configuré à l'intérieur du conteneur.

## Quels clients MCP peuvent l'utiliser ?

Tout client MCP prenant en charge les serveurs HTTP stdio ou Streamable peut utiliser CloakBrowser MCP. Le guide [Mise en route](getting-started.md) contient des exemples JSON stdio pour Codex, Claude Desktop, Claude Code, Cursor, les clients de type VS Code/Cline, Continue, Windsurf, Goose et les configurations de type Warp.

## Prend-il en charge les mêmes outils de navigateur que Playwright MCP ?

Oui. Les outils du navigateur Playwright MCP en amont sont transmis tels quels. Le projet effectue également une comparaison de parité dans le cadre de l'intégration continue (CI), ce qui permet de vérifier que les modifications apportées au pont sont conformes au comportement officiel de Playwright MCP.

## Docker améliore-t-il la sécurité ?

Docker vous offre un environnement d'exécution plus reproductible et isolé, mais cela ne rend pas pour autant l'automatisation du navigateur sans risque. Considérez la navigation automatisée comme une exécution non fiable : évitez de partager des informations confidentielles avec des pages inconnues, conservez les artefacts et les captures d’écran dans des répertoires contrôlés, et consultez le guide [Sécurité](security.md) avant d’exposer le serveur à d’autres systèmes.

## Ce projet utilise-t-il des outils d'analyse ou de suivi ?

Non. Le site de documentation n'active pas les statistiques par défaut. L'indexation par les moteurs de recherche est gérée via des métadonnées standard, `robots.txt`, la génération d'un plan du site, des balises de vérification du webmaster (facultatives) et des notifications IndexNow (facultatives).
