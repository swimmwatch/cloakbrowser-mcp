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

Pour une référence upstream stable, consultez le test de capacités Playwright MCP `{{ project.playwright_mcp_package_tag }}` fixé au commit exact du paquet : [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/4c1fb03bad3bae379b0ae0e3d81d2660de56bd91/tests/capabilities.spec.ts#L19-L77).

Ce projet considère upstream Playwright MCP comme source faisant autorité et ne maintient pas de référence de schéma copiée.

L'ensemble par défaut contient 24 outils upstream.
`PLAYWRIGHT_MCP_CAPS=devtools` transmet la capacité `devtools` au processus
enfant sans option `--caps` propre au pont ; les outils et schémas upstream qui
en résultent sont transmis sans modification, y compris
`browser_start_recording` et `browser_stop_recording`.

!!! warning "Limitation d'enregistrement avec le binaire public CloakBrowser v146"
    Les outils d'enregistrement sont disponibles, mais le binaire public Chromium 146
    sans clé utilisé par CloakBrowser 0.5.10 désactive volontairement la liaison Playwright
    entre la page et l'hôte pour préserver la furtivité. Par conséquent,
    `browser_stop_recording` peut renvoyer du code partiel : la navigation est enregistrée,
    tandis que les saisies et les clics réussis sont omis. Vérifiez les enregistrements
    générés avant de les réutiliser.

    La compatibilité activable explicitement est suivie dans [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    La décision sous-jacente concernant la liaison est abordée dans
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) et
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

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

La surface locale reste limitée à ces deux outils de diagnostic. `SessionSeats`
et `getSessionSeats` ne sont pas exposés comme outil MCP, car CloakBrowser 0.5.10
n'exporte pas cette API depuis son point d'entrée public.

## Parité

CI construit l'image Docker et exécute `npm run bridge:compare`. Ce script démarre en parallèle l'image officielle Playwright MCP et l'image du pont CloakBrowser, compare la liste des outils upstream et exerce les outils navigateur upstream par défaut sur la même page fixture.

Utilisez `--report` pour écrire un rapport JSON lisible par machine :

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI téléverse ce rapport comme artifact pour les builds Docker et les builds de release.
