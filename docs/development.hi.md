---
description: Development workflow for the Playwright MCP bridge.
icon: material/code-braces
tags:
  - Project Internals
---

# विकास

## सेटअप

```bash
npm install
npm run build
node dist/cli.js --help
```

## दैनिक आदेश

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

## स्रोत लेआउट

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

हटाए गए नेटिव एडाप्टर/टूल-रजिस्ट्री कार्यान्वयन को पुनः शामिल नहीं किया जाना चाहिए। अपस्ट्रीम Playwright MCP ब्राउज़र टूल व्यवहार का मालिक है।

## स्थानीय डॉकर

```bash
npm run docker:build
npm run docker:smoke
docker run --rm --init -i -v "$PWD/artifacts:/data" cloakbrowser-mcp:dev
```

## दस्तावेज़

```bash
npm run docs:install
npm run docs:assets
npm run docs:serve
npm run docs:build
```
