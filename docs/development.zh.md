---
description: Playwright MCP 桥接器的开发工作流。
icon: material/code-braces
tags:
  - Project Internals
---

# 开发

## 设置

```bash
npm install
npm run build
node dist/cli.js --help
```

## 日常指令

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

## 源代码布局

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

已移除的原生适配器/工具注册表实现不应重新引入。上游 Playwright MCP 负责浏览器工具的行为。

## 本地 Docker

```bash
npm run docker:build
npm run docker:smoke
docker run --rm -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## 文档

```bash
npm run docs:install
npm run docs:assets
npm run docs:metadata:check
npm run docs:serve
npm run docs:build
```
