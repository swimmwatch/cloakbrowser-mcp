---
title: "@playwright/mcp vs cloakbrowser-mcp"
description: Compare Playwright MCP amont et CloakBrowser MCP pour la parité des outils, l’exécution CloakBrowser, le packaging, Streamable HTTP, les profils, extensions, QA régionale et saisie humanisée.
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp vs cloakbrowser-mcp

Le paquet d’origine `@playwright/mcp` est le serveur de référence des outils navigateur Playwright MCP. `cloakbrowser-mcp` vise les équipes qui souhaitent ces mêmes outils avec Chromium de CloakBrowser et des procédures de déploiement empaquetées.

## Comparaison des fonctions

| Fonction | `@playwright/mcp` | `cloakbrowser-mcp` |
| --- | --- | --- |
| Outils upstream inchangés | Définit les schémas, descriptions et réponses de référence des outils navigateur. | Transmet les outils upstream sans modification et vérifie leur équivalence en CI. |
| Binaire CloakBrowser | Utilise le navigateur choisi par Playwright MCP upstream. | Génère une configuration upstream avec Chromium de CloakBrowser comme exécutable. |
| Distribution npm | Est publié comme paquet d’origine Playwright MCP. | Est publié sous le nom `cloakbrowser-mcp` pour `npx` et les configurations stdio des clients MCP. |
| Image Docker | Fournit l’image officielle Playwright MCP. | Se base sur l’image officielle Playwright MCP et prépare les valeurs par défaut du runtime CloakBrowser. |
| Streamable HTTP | Suit le comportement de transport upstream. | Regroupe stdio et Streamable HTTP avec santé, disponibilité, authentification, HTTPS et métadonnées de session. |
| Profils persistants | Utilise les options d’état du navigateur prises en charge par upstream. | Valide `PLAYWRIGHT_MCP_USER_DATA_DIR` et verrouille le profil lors de la génération de configuration. |
| Chemins d’extensions | Se configurent via le navigateur lorsqu’il le permet. | Charge des répertoires validés d’extensions Chrome et exige un profil persistant. |
| Validation du contexte | Dépend de la structure de configuration upstream. | Valide les options de contexte prises en charge avant d’écrire la configuration Playwright MCP. |
| QA régionale avec GeoIP | Le routage proxy reste sous la responsabilité upstream. | Peut aligner les indicateurs d’empreinte de fuseau horaire, langue et locale CloakBrowser sur la localisation du proxy configuré. |
| Interactions humanisées | Utilise le comportement standard d’interaction de Playwright MCP. | Peut appliquer le comportement de saisie humanisée de CloakBrowser aux interactions prises en charge. |

## Quand choisir Playwright MCP d’origine

- vous voulez l’installation Playwright MCP la plus petite ;
- vous n’avez pas besoin de CloakBrowser Chromium ;
- vous préférez suivre directement le packaging amont de Playwright MCP.

## Quand choisir CloakBrowser MCP

- les outils Playwright MCP doivent tourner avec CloakBrowser Chromium ;
- vous voulez des chemins documentés pour npm, Docker ou Streamable HTTP ;
- vous avez besoin de profils persistants, extensions, validation de contexte, QA régionale ou saisie humanisée.

## Étapes suivantes

- [Pour commencer](getting-started.md)
- [Recettes](recipes/index.md)
- [Outils](tools.md)
