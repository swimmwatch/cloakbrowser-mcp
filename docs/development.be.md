---
description: Распрацоўка брыджа Playwright MCP.
icon: material/code-braces
tags:
  - Project Internals
---

# Развіццё

## Налада

```bash
npm install
npm run build
node dist/cli.js --help
```

## Штодзённыя каманды

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

## Размеркаванне крыніцы

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

Выдаленую рэалізацыю карэннага адаптара/рэестра інструментаў не варта вяртаць. Асноўны праект Playwright MCP адказвае за паводзіны інструментаў браўзера.

## Лакальны Docker

```bash
npm run docker:build
npm run docker:smoke
docker run --rm --init -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Дакументы

```bash
npm run docs:install
npm run docs:assets
npm run docs:serve
npm run docs:build
```
