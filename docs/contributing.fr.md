---
description: Liste de contrôle des contributions et guide des pull requests pour le développement de CloakBrowser MCP.
icon: material/source-pull
tags:
  - Project Internals
---

# Contribuer

Avant de créer une pull request, effectuez les vérifications locales et consultez la page consacrée à l'architecture de Bridge.

```bash
npm install
npm run check
```

## Liste de contrôle pour les pull requests

- [ ] `npm run check` est validé.
- [ ] Le nouveau comportement du pont fait l'objet de tests.
- [ ] Les schémas, descriptions et réponses MCP de Playwright en amont restent inchangés.
- [ ] Les modifications visibles par l'utilisateur sont documentées.
- [ ] `CHANGELOG.md` est mis à jour pour refléter les modifications visibles par l'utilisateur.
- [ ] Les modifications ayant une incidence sur la sécurité sont mentionnées dans la description de la pull request.

## Ce qu'il ne faut pas faire

- Ne réintroduisez pas l'adaptateur natif du navigateur, le registre d'outils ou le modèle de capacités qui ont été supprimés.
- N'enregistrez pas de journaux d'exécution dans `stdout` ; stdio est réservé à MCP JSON-RPC.
- N’ajoutez pas de dépendance à moins qu’elle ne soit importée par l’environnement d’exécution ou les tests.
- N’assouplissez pas les paramètres de TypeScript, ESLint ou Prettier pour faire accepter une modification.
- Ne validez pas `dist/`, `coverage/`, `artifacts/`, `site/`, `.venv-docs/`, ou `node_modules/`.

## Problèmes de sécurité

Signalez les vulnérabilités via les avis de sécurité GitHub, et non via des tickets publics. Consultez le fichier [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
