---
description: Entwicklungsablauf für die Playwright-MCP-Brücke.
icon: material/code-braces
tags:
  - Project Internals
---

# Entwicklung

## Einrichtung

```bash
npm install
npm run build
node dist/cli.js --help
```

## Tägliche Befehle

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

## Quelllayout

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

Die entfernte native Adapter-/Tool-Registry-Implementierung sollte nicht wieder eingeführt werden. Die Verantwortung für das Verhalten der Browser-Tools liegt beim Upstream-Playwright-MCP.

## Docker lokal

```bash
npm run docker:build
npm run docker:smoke
docker run --rm --init -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Dokumente

```bash
npm run docs:install
npm run docs:assets
npm run docs:serve
npm run docs:build
```
