---
description: Development workflow for the Playwright MCP bridge.
icon: material/code-braces
tags:
  - Project Internals
---

# Development

## Setup

```bash
npm install
npm run build
node dist/cli.js --help
```

## Daily Commands

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

## Source Layout

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

The removed native adapter/tool-registry implementation should not be reintroduced. Upstream Playwright MCP owns browser tool behavior.

## Local Docker

```bash
npm run docker:build
npm run docker:smoke
docker run --rm -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## Docs

```bash
npm run docs:install
npm run docs:assets
npm run docs:metadata:check
npm run docs:serve
npm run docs:build
```
