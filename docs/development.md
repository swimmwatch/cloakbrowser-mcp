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
npm test
npm run build
npm run check
```

## Source Layout

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
npm run docs:serve
npm run docs:build
```
