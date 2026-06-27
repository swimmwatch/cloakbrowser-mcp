---
description: Fluxo de trabalho de desenvolvimento para a ponte MCP do Playwright.
icon: material/code-braces
tags:
  - Project Internals
---

# Desenvolvimento

## Configuração

```bash
npm install
npm run build
node dist/cli.js --help
```

## Comandos diários

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

## Layout da fonte

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

A implementação removida do adaptador nativo/registro de ferramentas não deve ser reintroduzida. O MCP do Playwright (upstream) é responsável pelo comportamento das ferramentas do navegador.

## Docker local

```bash
npm run docker:build
npm run docker:smoke
docker run --rm --init -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Documentos

```bash
npm run docs:install
npm run docs:assets
npm run docs:serve
npm run docs:build
```
