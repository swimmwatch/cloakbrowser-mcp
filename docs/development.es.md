---
description: Flujo de trabajo de desarrollo para el puente MCP de Playwright.
icon: material/code-braces
tags:
  - Project Internals
---

# Desarrollo

## Configuración

```bash
npm install
npm run build
node dist/cli.js --help
```

## Comandos diarios

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

## Diseño de la fuente

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

No se debe volver a introducir la implementación del adaptador nativo y el registro de herramientas que se ha eliminado. El MCP de Playwright (proyecto original) es el responsable del comportamiento de las herramientas del navegador.

## Docker local

```bash
npm run docker:build
npm run docker:smoke
docker run --rm -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Documentación

```bash
npm run docs:install
npm run docs:assets
npm run docs:metadata:check
npm run docs:serve
npm run docs:build
```
