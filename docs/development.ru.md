---
description: Рабочий процесс разработки моста Playwright MCP.
icon: material/code-braces
tags:
  - Project Internals
---

# Разработка

## Настройка

```bash
npm install
npm run build
node dist/cli.js --help
```

## Ежедневные команды

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

## Структура исходного кода

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

Удаленную реализацию адаптера/реестра инструментов не следует вводить заново. Ответственность за поведение инструментов браузера несет основной проект Playwright MCP.

## Локальный Docker

```bash
npm run docker:build
npm run docker:smoke
docker run --rm --init -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Документы

```bash
npm run docs:install
npm run docs:assets
npm run docs:serve
npm run docs:build
```
