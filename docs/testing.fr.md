---
description: Stratégie de test de CloakBrowser MCP avec tests unitaires, tests d'intégration avec upstream factice, smoke tests Docker et contrôles de parité Playwright MCP.
icon: material/test-tube
tags:
  - Tests
  - Internes du projet
---

# Tests

## Tests unitaires

```bash
npm run test:unit
```

Les tests unitaires couvrent l'analyse de l'environnement, la génération de configuration du pont, la gestion des arguments de lancement et les outils locaux d'introspection Cloak.

## Tests d'intégration

```bash
npm run test:integration
```

Les tests d'intégration utilisent un processus enfant MCP upstream factice et vérifient que le pont fusionne les outils locaux et transmet les appels upstream sans modification.

CI exécute les tests unitaires, d'intégration et E2E de la CLI empaquetée sur Node.js 22-26 pour Linux x64, Linux arm64, macOS arm64, macOS x64 et Windows x64.

## Vérification du paquet

```bash
npm run package:verify
```

Cette commande construit le paquet, exécute `npm pack`, vérifie la liste des fichiers du tarball, installe le tarball dans un projet temporaire et valide `--version` et `--help` de la CLI.

La vérification du paquet valide aussi `server.json` avec le schéma publié de serveur MCP.

## Smoke test Docker

```bash
npm run docker:build
npm run docker:smoke
```

Le smoke test vérifie que l'image construite démarre et affiche l'aide de la CLI. CI exécute des smoke tests des images Docker pour `linux/amd64` et `linux/arm64`.

## Parité avec upstream

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Le script de parité démarre l'image Docker officielle Playwright MCP et l'image du pont CloakBrowser, compare les noms d'outils upstream, exerce la surface d'outils navigateur par défaut sur une même page fixture et vérifie les outils locaux d'introspection Cloak.

CI téléverse le rapport JSON de parité comme artifact pour les jobs de build Docker et de release. La parité navigateur s'exécute actuellement sur `linux/amd64`; les jobs Docker arm64 utilisent des smoke tests et des contrôles de vulnérabilités.

## Contrôles de sécurité

```bash
npm run audit:prod
npm run server:validate
```

CI exécute également CodeQL, Dependency Review, OpenSSF Scorecard, zizmor et Trivy. Ces outils sont gratuits pour les dépôts publics et ne nécessitent pas de comptes externes.
