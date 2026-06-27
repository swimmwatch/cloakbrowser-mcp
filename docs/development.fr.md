---
description: Processus de développement du pont MCP Playwright.
icon: material/code-braces
tags:
  - Project Internals
---

# Développement

## Configuration

```bash
npm install
npm run build
node dist/cli.js --help
```

## Commandes quotidiennes

```bash
npm run typecheck
npm run lint
npm run format:check
npm run server:validate
npm run audit:prod
npm test
npm run build
npm run check
```

## Mise en page de la source

```text
src/
  cli.ts                  CLI entry point
  server.ts               outer MCP proxy server
  bridge/
    config.ts             Playwright MCP config generation
    env.ts                env parsing helpers
    paths.ts              upstream package path resolution
    tools.ts              local Cloak introspection tools
  runtime/
    consoleFallback.ts    compatibility patch source strings
  project/
    metadata.ts           package and MCP metadata
```

L'implémentation native de l'adaptateur/du registre d'outils qui a été supprimée ne doit pas être réintroduite. C'est le MCP en amont de Playwright qui gère le comportement des outils du navigateur.

## Docker local

```bash
npm run docker:build
npm run docker:smoke
docker run --rm --init -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Documentation

```bash
npm run docs:install
npm run docs:assets
npm run docs:serve
npm run docs:build
```
