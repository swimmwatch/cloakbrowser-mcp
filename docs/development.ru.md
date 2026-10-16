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
  cli.ts, cli/    CLI options and process lifecycle
  server.ts       upstream MCP proxy
  bridge/         browser configuration and local introspection
  cdp/            managed CDP leases, readiness and capability proxy
  http/           Streamable HTTP sessions and transport
  docker/         container launcher, display and health checks
  runtime/        console and humanize compatibility
  logging/        runtime diagnostics
  protocol/       shared MCP protocol support
  project/        package and server metadata
```

Удаленную реализацию адаптера/реестра инструментов не следует вводить заново. Ответственность за поведение инструментов браузера несет основной проект Playwright MCP.

## Локальный Docker

```bash
npm run docker:build
npm run docker:smoke
docker run --rm -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Документы

```bash
npm run docs:install
npm run docs:assets
npm run docs:metadata:check
npm run docs:serve
npm run docs:build
```
