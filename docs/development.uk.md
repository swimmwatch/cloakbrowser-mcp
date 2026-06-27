---
description: Процес розробки мосту Playwright MCP.
icon: material/code-braces
tags:
  - Project Internals
---

# Розробка

## Налаштування

```bash
npm install
npm run build
node dist/cli.js --help
```

## Щоденні команди

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

## Розміщення джерела

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

Вилучену реалізацію вбудованого адаптера/реєстру інструментів не слід повертати. Відповідальність за поведінку інструментів браузера покладається на розробників основного проекту Playwright MCP.

## Локальний Docker

```bash
npm run docker:build
npm run docker:smoke
docker run --rm --init -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Документація

```bash
npm run docs:install
npm run docs:assets
npm run docs:serve
npm run docs:build
```
