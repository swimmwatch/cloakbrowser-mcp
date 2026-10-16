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

Выдаленую рэалізацыю карэннага адаптара/рэестра інструментаў не варта вяртаць. Асноўны праект Playwright MCP адказвае за паводзіны інструментаў браўзера.

## Лакальны Docker

```bash
npm run docker:build
npm run docker:smoke
docker run --rm -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Дакументы

```bash
npm run docs:install
npm run docs:assets
npm run docs:metadata:check
npm run docs:serve
npm run docs:build
```
