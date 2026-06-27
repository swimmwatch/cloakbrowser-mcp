---
description: Point d'entrée des contributeurs pour CloakBrowser MCP.
icon: material/source-branch
tags:
  - Project Internals
---

# Guide du contributeur

La documentation destinée aux utilisateurs est délibérément axée sur l'installation et l'utilisation du serveur MCP. Les ressources de développement sont regroupées ici.

## Sections

- [Développement](development.md) pour la configuration locale et la structure des paquets.
- [Tests](testing.md) pour les tests unitaires, d'intégration, Docker, de paquets npm et de parité.
- [Architecture](architecture.md) pour la conception du runtime du pont.
- [Publication](release.md) pour les paramètres du dépôt et les workflows de publication.
- [Contribution](contributing.md) pour le workflow du projet.

## Vérification locale obligatoire

```bash
npm run check
```

Effectuez la vérification complète avant de valider les modifications. La vérification de parité Docker est plus lourde et peut être lancée à l'aide de la commande suivante :

```bash
npm run docker:build
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Les vérifications des métadonnées et des dépendances de production peuvent être lancées directement à l'aide de :

```bash
npm run server:validate
npm run audit:prod
```
