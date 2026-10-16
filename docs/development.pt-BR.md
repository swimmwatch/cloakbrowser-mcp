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

A implementação removida do adaptador nativo/registro de ferramentas não deve ser reintroduzida. O MCP do Playwright (upstream) é responsável pelo comportamento das ferramentas do navegador.

## Docker local

```bash
npm run docker:build
npm run docker:smoke
docker run --rm -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Documentos

```bash
npm run docs:install
npm run docs:assets
npm run docs:metadata:check
npm run docs:serve
npm run docs:build
```
