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

Pour une référence upstream stable, consultez le test de capacités Playwright MCP `@playwright/mcp@0.0.76` fixé au commit exact du paquet : [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/b301c372ec741289eff1cf6aab9d3bec553f31e2/tests/capabilities.spec.ts#L19-L77).

Ce projet considère upstream Playwright MCP comme source faisant autorité et ne maintient pas de référence de schéma copiée.

## Outils locaux

### `cloakbrowser_binary_info`

Retourne des informations structurées sur le paquet CloakBrowser, la plateforme actuelle, le répertoire de cache, le chemin binaire attendu, l'état d'installation et le resolved executable path utilisé par le pont.

### `cloakbrowser_bridge_info`

Retourne les métadonnées structurées du pont :

- nom et version du MCP server ;
- mode d'exécution ;
- paquet et version upstream Playwright MCP ;
- nombre d'outils upstream ;
- noms des outils locaux spécifiques à Cloak.

## Parité

CI construit l'image Docker et exécute `npm run bridge:compare`. Ce script démarre en parallèle l'image officielle Playwright MCP et l'image du pont CloakBrowser, compare la liste des outils upstream et exerce les outils navigateur upstream par défaut sur la même page fixture.

Utilisez `--report` pour écrire un rapport JSON lisible par machine :

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI téléverse ce rapport comme artifact pour les builds Docker et les builds de release.
